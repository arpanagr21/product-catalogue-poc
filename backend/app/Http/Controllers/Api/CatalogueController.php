<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListProductsRequest;
use App\Http\Requests\UpdateFeaturedProductsRequest;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class CatalogueController extends Controller
{
    public function __construct(private ProductService $products) {}

    public function featured(): JsonResponse
    {
        return response()->json(['data' => $this->products->featured()]);
    }

    public function categories(): JsonResponse
    {
        return response()->json(['data' => $this->products->categories()]);
    }

    public function category(string $slug): JsonResponse
    {
        return response()->json(['data' => $this->products->category($slug) ?? abort(404, 'Category not found.')]);
    }

    /** All products, or search results with ?q=. Paginated. */
    public function products(ListProductsRequest $request): JsonResponse
    {
        return response()->json($this->products->paginate($request->term(), $request->page(), $request->perPage()));
    }

    public function product(string $id): JsonResponse
    {
        return response()->json(['data' => $this->products->find($id) ?? abort(404, 'Product not found.')]);
    }

    public function image(string $id): Response
    {
        $product = $this->products->find($id) ?? abort(404, 'Product not found.');
        abort_if($product->imageUrl === '', 404, 'This product has no image.');

        [$type, $body] = $this->products->image($product);

        return response($body, 200, [
            'Content-Type' => $type,
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** Admin: replace the five featured products (in order). */
    public function updateFeatured(UpdateFeaturedProductsRequest $request): JsonResponse
    {
        $this->products->setFeatured($request->productIds());

        return $this->featured();
    }
}
