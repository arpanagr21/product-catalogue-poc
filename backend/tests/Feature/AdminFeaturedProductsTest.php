<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ProductService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminFeaturedProductsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeCatalogue();
    }

    public function test_guests_cannot_change_featured_products(): void
    {
        $this->fromSpa()
            ->putJson('/api/admin/featured', ['product_ids' => ['1', '2', '3', '5', '6']])
            ->assertUnauthorized();
    }

    public function test_admin_chooses_the_five_featured_products_in_order(): void
    {
        $this->actingAs(User::factory()->create());

        $this->fromSpa()
            ->putJson('/api/admin/featured', ['product_ids' => ['6', '1', '12', '3', '9']])
            ->assertOk()
            ->assertJsonPath('data.*.id', ['6', '1', '12', '3', '9']);

        $this->assertSame(['6', '1', '12', '3', '9'], app(ProductService::class)->featuredIds());
    }

    public function test_exactly_five_distinct_existing_products_are_required(): void
    {
        $this->actingAs(User::factory()->create());

        $this->fromSpa()->putJson('/api/admin/featured', ['product_ids' => ['1', '2']])
            ->assertJsonValidationErrors(['product_ids' => 'Choose exactly 5 featured products.']);

        $this->fromSpa()->putJson('/api/admin/featured', ['product_ids' => ['1', '1', '2', '3', '5']])
            ->assertJsonValidationErrors('product_ids.1');

        $this->fromSpa()->putJson('/api/admin/featured', ['product_ids' => ['1', '2', '3', '5', '999']])
            ->assertJsonValidationErrors(['product_ids.4' => 'Product 999 does not exist.']);
    }
}
