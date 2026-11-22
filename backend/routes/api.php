<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogueController;
use App\Http\Controllers\Api\EnquiryController;
use Illuminate\Support\Facades\Route;

// Public catalogue
Route::get('featured', [CatalogueController::class, 'featured']);
Route::get('categories', [CatalogueController::class, 'categories']);
Route::get('categories/{slug}', [CatalogueController::class, 'category']);
Route::get('products', [CatalogueController::class, 'products']);
Route::get('products/{id}', [CatalogueController::class, 'product']);
Route::get('products/{id}/image', [CatalogueController::class, 'image']);
Route::post('enquiries', [EnquiryController::class, 'store'])->middleware('throttle:enquiries');

// Admin auth (Sanctum SPA, cookie based)
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('user', [AuthController::class, 'user']);
    Route::put('admin/featured', [CatalogueController::class, 'updateFeatured']);
});
