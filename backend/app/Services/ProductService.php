<?php

namespace App\Services;

use App\Contracts\ProductProvider;
use App\Data\Category;
use App\Data\Product;
use App\Exceptions\CatalogueUnavailableException;
use App\Models\FeaturedProduct;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Everything the app does with products. Controllers only talk to this;
 * the data source is whatever ProductProvider gets injected.
 */
class ProductService
{
    public function __construct(private ProductProvider $provider) {}

    public function find(string $id): ?Product
    {
        return $this->provider->find($id);
    }

    /** @return list<Category> Derived from the products, so empty categories never show. */
    public function categories(): array
    {
        return collect($this->provider->all())->map(fn (Product $p) => $p->category)->unique('slug')->values()->all();
    }

    /**
     * One page of products, or of search results when $term is given.
     * Paged here because Fake Store can't page (it only has ?limit=N).
     *
     * @return array{data: list<Product>, meta: array<string, int|null>}
     */
    public function paginate(string $term, int $page, int $perPage): array
    {
        $products = $term === '' ? $this->provider->all() : $this->provider->search($term);
        $items = array_slice($products, ($page - 1) * $perPage, $perPage);
        $from = ($page - 1) * $perPage + 1;

        return [
            'data' => $items,
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil(count($products) / $perPage)),
                'per_page' => $perPage,
                'total' => count($products),
                'from' => $items ? $from : null,
                'to' => $items ? $from + count($items) - 1 : null,
            ],
        ];
    }

    /**
     * Category page: "top rated" first (admin's picks in this category, then the
     * highest rated), then the rest in the provider's order. Null if no such category.
     *
     * @return array{category: Category, top_rated: list<Product>, products: list<Product>}|null
     */
    public function category(string $slug): ?array
    {
        $products = array_values(array_filter($this->provider->all(), fn (Product $p) => $p->category->slug === $slug));
        if ($products === []) {
            return null;
        }

        $featured = array_flip($this->featuredIds());
        $ranked = collect($products)->sortBy([
            fn (Product $a, Product $b) => ($featured[$a->id] ?? PHP_INT_MAX) <=> ($featured[$b->id] ?? PHP_INT_MAX),
            fn (Product $a, Product $b) => ($b->rating ?? -1) <=> ($a->rating ?? -1),
        ]);
        $top = $ranked->take(config('catalogue.category_top_rated_count'))->values()->all();
        $topIds = array_map(fn (Product $p) => $p->id, $top);

        return [
            'category' => $products[0]->category,
            'top_rated' => $top,
            'products' => array_values(array_filter($products, fn (Product $p) => ! in_array($p->id, $topIds, true))),
        ];
    }

    /** @return list<string> The admin's picks, in order. */
    public function featuredIds(): array
    {
        return FeaturedProduct::query()->orderBy('position')->pluck('product_id')->all();
    }

    /** @return list<Product> Picks the provider no longer has are skipped. */
    public function featured(): array
    {
        return array_values(array_filter(array_map($this->provider->find(...), $this->featuredIds())));
    }

    /** @param list<string> $ids */
    public function setFeatured(array $ids): void
    {
        DB::transaction(function () use ($ids) {
            FeaturedProduct::query()->delete();
            foreach (array_values($ids) as $i => $id) {
                FeaturedProduct::create(['product_id' => $id, 'position' => $i + 1]);
            }
        });
    }

    /**
     * The product's image bytes. We proxy because Fake Store sends
     * Cross-Origin-Resource-Policy: same-origin, so browsers won't hotlink it.
     *
     * @return array{0: string, 1: string} [content type, body], cached on disk for a day
     */
    public function image(Product $product): array
    {
        return Cache::store('file')->remember('catalogue:image:'.sha1($product->imageUrl), now()->addDay(), function () use ($product) {
            try {
                $response = Http::timeout(10)->retry(2, 200)->get($product->imageUrl)->throw();
            } catch (Throwable $e) {
                throw new CatalogueUnavailableException('Image request failed: '.$e->getMessage(), previous: $e);
            }

            $type = (string) $response->header('Content-Type');
            if (! str_starts_with($type, 'image/')) {
                throw new CatalogueUnavailableException("Upstream image has unexpected type [{$type}].");
            }

            return [$type, $response->body()];
        });
    }
}
