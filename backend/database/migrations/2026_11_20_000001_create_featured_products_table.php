<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Admin-curated "top rated" products. Stores provider product IDs only,
        // so it is independent of whichever ProductProvider is active.
        Schema::create('featured_products', function (Blueprint $table) {
            $table->id();
            $table->string('product_id')->unique();
            $table->unsignedSmallInteger('position')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('featured_products');
    }
};
