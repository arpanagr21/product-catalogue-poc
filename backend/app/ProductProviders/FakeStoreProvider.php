<?php

namespace App\ProductProviders;

use App\Contracts\ProductProvider;
use App\Data\Category;
use App\Data\Product;
use App\Exceptions\CatalogueUnavailableException;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * https://fakestoreapi.com has 20 products and no paging or search (only ?limit=N),
 * so we fetch everything once, cache it, and filter in memory.
 */
class FakeStoreProvider implements ProductProvider
{
    public function __construct(
        #[Config('catalogue.fakestore.base_url')] private string $baseUrl,
        #[Config('catalogue.fakestore.cache_ttl')] private int $cacheTtl,
        #[Config('catalogue.fakestore.timeout')] private int $timeout,
        #[Config('catalogue.fakestore.currency')] private string $currency,
    ) {}

    public function all(): array
    {
        return array_map($this->toProduct(...), $this->fetch());
    }

    public function find(string $id): ?Product
    {
        return collect($this->all())->first(fn (Product $p) => $p->id === $id);
    }

    public function search(string $term): array
    {
        return array_values(array_filter($this->all(), fn (Product $p) => $p->matches($term)));
    }

    private const CACHE_KEY = 'catalogue:fakestore:products';

    private const LAST_GOOD_KEY = 'catalogue:fakestore:products:last-good';

    /**
     * Raw upstream list, cached for $cacheTtl. If a refresh fails we serve the
     * last good copy rather than taking the shop down; only if we've never had
     * data does the failure reach the user (as a 502).
     */
    private function fetch(): array
    {
        if (is_array($fresh = Cache::get(self::CACHE_KEY))) {
            return $fresh;
        }

        try {
            $products = $this->download();
        } catch (CatalogueUnavailableException $e) {
            $lastGood = Cache::get(self::LAST_GOOD_KEY);
            if (! is_array($lastGood)) {
                throw $e;
            }
            report($e); // still worth knowing about
            Cache::put(self::CACHE_KEY, $lastGood, 60); // retry in a minute, not on every request

            return $lastGood;
        }

        Cache::put(self::CACHE_KEY, $products, $this->cacheTtl);
        Cache::forever(self::LAST_GOOD_KEY, $products);

        return $products;
    }

    private function download(): array
    {
        try {
            $products = Http::baseUrl($this->baseUrl)->acceptJson()->timeout($this->timeout)
                ->retry(2, 200)->get('/products')->throw()->json();
        } catch (Throwable $e) {
            throw new CatalogueUnavailableException('Fake Store request failed: '.$e->getMessage(), previous: $e);
        }

        if (! is_array($products) || ! array_is_list($products)) {
            throw new CatalogueUnavailableException('Fake Store returned an unexpected payload.');
        }

        return $products;
    }

    private function toProduct(array $raw): Product
    {
        return new Product(
            id: (string) $raw['id'],
            title: (string) $raw['title'],
            description: (string) ($raw['description'] ?? ''),
            price: (float) $raw['price'],
            currency: $this->currency,
            imageUrl: (string) ($raw['image'] ?? ''),
            category: Category::fromName((string) $raw['category']),
            rating: isset($raw['rating']['rate']) ? (float) $raw['rating']['rate'] : null,
            ratingCount: isset($raw['rating']['count']) ? (int) $raw['rating']['count'] : null,
        );
    }
}
