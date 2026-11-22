<?php

namespace Tests\Feature;

use App\Services\ProductService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CatalogueApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeCatalogue();
    }

    public function test_home_page_shows_the_chosen_featured_products_in_order(): void
    {
        // "18" isn't in the catalogue (e.g. removed upstream) and is skipped, not an error.
        app(ProductService::class)->setFeatured(['12', '18', '3', '5', '1']);

        $this->getJson('/api/featured')
            ->assertOk()
            ->assertJsonPath('data.*.id', ['12', '3', '5', '1']);
    }

    public function test_it_lists_categories(): void
    {
        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonPath('data.0', ['slug' => 'mens-clothing', 'name' => "Men's clothing"])
            ->assertJsonCount(3, 'data');
    }

    public function test_category_page_shows_top_rated_then_the_rest(): void
    {
        // Product 1 is curated, so it outranks higher-rated products in its category.
        app(ProductService::class)->setFeatured(['12', '1', '11', '5', '9']);
        config(['catalogue.category_top_rated_count' => 2]);

        $this->getJson('/api/categories/mens-clothing')
            ->assertOk()
            ->assertJsonPath('data.category.slug', 'mens-clothing')
            ->assertJsonPath('data.top_rated.*.id', ['1', '3']) // curated first, then highest rating (4.7)
            ->assertJsonPath('data.products.*.id', ['2']);
    }

    public function test_unknown_category_is_404(): void
    {
        $this->getJson('/api/categories/nope')
            ->assertNotFound()
            ->assertJsonPath('message', 'Category not found.');
    }

    public function test_search_only_returns_matching_products(): void
    {
        $this->getJson('/api/products?q=jacket')
            ->assertOk()
            ->assertJsonPath('data.*.id', ['3']);
    }

    public function test_empty_search_returns_all_products(): void
    {
        $this->getJson('/api/products?q=')
            ->assertOk()
            ->assertJsonCount(8, 'data')
            ->assertJsonPath('meta.total', 8);
    }

    public function test_products_are_paginated(): void
    {
        $this->getJson('/api/products?per_page=3&page=2')
            ->assertOk()
            ->assertJsonPath('data.*.id', ['5', '6', '9'])
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.per_page', 3)
            ->assertJsonPath('meta.total', 8)
            ->assertJsonPath('meta.from', 4)
            ->assertJsonPath('meta.to', 6);
    }

    public function test_search_results_are_paginated(): void
    {
        $this->getJson('/api/products?q=wd&per_page=1&page=2')
            ->assertOk()
            ->assertJsonPath('data.*.id', ['12'])
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_a_page_past_the_end_is_empty_not_an_error(): void
    {
        $this->getJson('/api/products?page=99')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 8)
            ->assertJsonPath('meta.from', null);
    }

    public function test_pagination_parameters_are_validated(): void
    {
        $this->getJson('/api/products?page=0&per_page=51')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page', 'per_page']);
    }

    public function test_search_term_length_is_validated(): void
    {
        $this->getJson('/api/products?q='.str_repeat('a', 101))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('q');
    }

    public function test_product_details(): void
    {
        $this->getJson('/api/products/11')
            ->assertOk()
            ->assertJson(['data' => [
                'id' => '11',
                'price' => 109,
                'currency' => 'USD',
                'category' => ['slug' => 'electronics', 'name' => 'Electronics'],
                'rating' => ['rate' => 4.8, 'count' => 319],
            ]]);
    }

    public function test_unknown_product_is_404(): void
    {
        $this->getJson('/api/products/999')->assertNotFound();
    }

    public function test_upstream_outage_returns_a_clean_502(): void
    {
        $this->fakeCatalogueDown();

        $this->getJson('/api/products')
            ->assertStatus(502)
            ->assertJsonStructure(['message'])
            ->assertJsonMissingPath('exception');
    }

    public function test_product_image_urls_point_at_our_proxy_not_the_provider(): void
    {
        $this->getJson('/api/products/11')
            ->assertJsonPath('data.image', url('/api/products/11/image'));
    }

    public function test_product_image_is_proxied_and_cached(): void
    {
        Cache::store('file')->flush();
        $this->fakeUpstream([
            'fakestore.test/products' => Http::response(json_decode(file_get_contents(base_path('tests/Fixtures/fakestore-products.json')), true)),
            'fakestoreapi.com/img/*' => Http::response('PNGDATA', 200, ['Content-Type' => 'image/png']),
        ]);

        $this->get('/api/products/11/image')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Cache-Control', 'max-age=86400, public');
        $this->get('/api/products/11/image')->assertOk();

        $this->assertSame('PNGDATA', $this->get('/api/products/11/image')->getContent());
        Http::assertSentCount(2); // one catalogue fetch + one image fetch
    }

    public function test_non_image_upstream_responses_are_rejected(): void
    {
        Cache::store('file')->flush();
        $this->fakeUpstream([
            'fakestore.test/products' => Http::response(json_decode(file_get_contents(base_path('tests/Fixtures/fakestore-products.json')), true)),
            'fakestoreapi.com/img/*' => Http::response('<html>challenge</html>', 200, ['Content-Type' => 'text/html']),
        ]);

        $this->get('/api/products/11/image')->assertStatus(502);
    }

    public function test_image_for_unknown_product_is_404(): void
    {
        $this->get('/api/products/999/image')->assertNotFound();
    }
}
