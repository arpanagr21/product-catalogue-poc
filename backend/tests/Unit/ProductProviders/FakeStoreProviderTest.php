<?php

namespace Tests\Unit\ProductProviders;

use App\Contracts\ProductProvider;
use App\Data\Product;
use App\Exceptions\CatalogueUnavailableException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FakeStoreProviderTest extends TestCase
{
    private function provider(): ProductProvider
    {
        return $this->app->make(ProductProvider::class);
    }

    public function test_it_maps_upstream_products_to_our_dtos(): void
    {
        $this->fakeCatalogue();

        $product = $this->provider()->find('3');

        $this->assertInstanceOf(Product::class, $product);
        $this->assertSame('3', $product->id);
        $this->assertSame('Mens Cotton Jacket', $product->title);
        $this->assertSame(55.99, $product->price);
        $this->assertSame('USD', $product->currency);
        $this->assertSame('mens-clothing', $product->category->slug);
        $this->assertSame("Men's clothing", $product->category->name);
        $this->assertSame(4.7, $product->rating);
        $this->assertSame(500, $product->ratingCount);
    }

    public function test_find_returns_null_for_unknown_ids(): void
    {
        $this->fakeCatalogue();

        $this->assertNull($this->provider()->find('999'));
    }

    public function test_search_requires_every_word_to_match_case_insensitively(): void
    {
        $this->fakeCatalogue();

        $ids = fn (string $term) => array_map(fn ($p) => $p->id, $this->provider()->search($term));

        $this->assertSame(['3'], $ids('COTTON jacket'));
        $this->assertSame(['9', '12'], $ids('wd drive'));
        $this->assertSame(['5', '6'], $ids('jewelery'), 'matches the category name too');
        $this->assertSame([], $ids('cotton drive'));
        $this->assertSame([], $ids('   '));
    }

    public function test_it_caches_the_upstream_response(): void
    {
        $this->fakeCatalogue();

        $this->provider()->all();
        $this->provider()->search('jacket');
        $this->provider()->find('1');

        Http::assertSentCount(1);
    }

    public function test_upstream_failure_raises_catalogue_unavailable_and_is_not_cached(): void
    {
        $this->fakeCatalogueDown();

        try {
            $this->provider()->all();
            $this->fail('Expected CatalogueUnavailableException');
        } catch (CatalogueUnavailableException) {
        }

        // Recovery: once upstream is back, the next call succeeds.
        $this->fakeUpstream(['fakestore.test/*' => Http::response([])]);
        $this->assertSame([], $this->provider()->all());
    }

    public function test_a_failed_refresh_serves_the_last_good_copy(): void
    {
        $this->fakeCatalogue();
        $this->provider()->all(); // a good fetch

        Cache::forget('catalogue:fakestore:products'); // fresh copy expires...
        $this->fakeCatalogueDown(); // ...and the upstream is down

        $this->assertCount(8, $this->provider()->all());
        $this->assertSame('Mens Cotton Jacket', $this->provider()->find('3')->title);
    }

    public function test_an_unexpected_payload_is_treated_as_unavailable(): void
    {
        $this->fakeUpstream(['fakestore.test/*' => Http::response(['error' => 'nope'])]);

        $this->expectException(CatalogueUnavailableException::class);

        $this->provider()->all();
    }
}
