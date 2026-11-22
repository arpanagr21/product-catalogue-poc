<?php

namespace Database\Seeders;

use App\Models\FeaturedProduct;
use App\Services\ProductService;
use Illuminate\Database\Seeder;

class FeaturedProductSeeder extends Seeder
{
    /** Default picks (highest rated Fake Store products). Never overwrites the admin's choices. */
    private const DEFAULT_IDS = ['12', '11', '3', '18', '5'];

    public function run(ProductService $products): void
    {
        if (FeaturedProduct::query()->exists()) {
            return;
        }

        $products->setFeatured(self::DEFAULT_IDS);
    }
}
