<?php

namespace Tests\Feature;

use App\Contracts\ProductProvider;
use App\Data\Category;
use App\Data\Product;
use App\ProductProviders\FakeStoreProvider;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** CATALOGUE_PROVIDER picks a class from config('catalogue.providers'), falling back to Fake Store. */
class ProviderSwapTest extends TestCase
{
    public function test_fake_store_is_the_default(): void
    {
        $this->assertInstanceOf(FakeStoreProvider::class, app(ProductProvider::class));
    }

    public function test_an_unknown_provider_name_falls_back_to_fake_store(): void
    {
        config(['catalogue.provider' => 'does-not-exist']);

        $this->assertInstanceOf(FakeStoreProvider::class, app(ProductProvider::class));
    }

    public function test_a_provider_registered_in_config_backs_the_whole_api(): void
    {
        config([
            'catalogue.providers.tea' => TeaShopProvider::class,
            'catalogue.provider' => 'tea',
        ]);

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'sku-abc')
            ->assertJsonPath('data.0.currency', 'GBP')
            ->assertJsonPath('data.0.rating', null);
        $this->getJson('/api/categories')->assertJsonPath('data', [['slug' => 'tea', 'name' => 'Tea']]);
        $this->getJson('/api/products/sku-abc')->assertJsonPath('data.title', 'Earl Grey');

        Http::assertNothingSent();
    }
}

/** A second, completely different source, to prove nothing else knows about Fake Store. */
class TeaShopProvider implements ProductProvider
{
    public function all(): array
    {
        return [new Product('sku-abc', 'Earl Grey', 'Bergamot black tea', 4.5, 'GBP', 'https://img.test/1.png', new Category('tea', 'Tea'))];
    }

    public function find(string $id): ?Product
    {
        return collect($this->all())->first(fn (Product $p) => $p->id === $id);
    }

    public function search(string $term): array
    {
        return array_values(array_filter($this->all(), fn (Product $p) => $p->matches($term)));
    }
}
