<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Kept so no lead is lost if the email fails; also the seed of a future CRM view.
        Schema::create('enquiries', function (Blueprint $table) {
            $table->id();
            $table->string('product_id');
            $table->string('product_title'); // Snapshot: provider data may change or disappear.
            $table->string('name');
            $table->string('email');
            $table->string('phone', 32)->nullable();
            $table->text('message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
