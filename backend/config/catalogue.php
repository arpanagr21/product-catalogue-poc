<?php

use App\ProductProviders\FakeStoreProvider;

return [

    // Which product source to use. Unknown or missing names fall back to Fake Store.
    'provider' => env('CATALOGUE_PROVIDER', 'fakestore'),

    // Name => class. To add a source: implement App\Contracts\ProductProvider and list it here.
    'providers' => [
        'fakestore' => FakeStoreProvider::class,
    ],

    // Fake Store API settings (injected into FakeStoreProvider via #[Config]).
    'fakestore' => [
        'base_url' => env('FAKESTORE_BASE_URL', 'https://fakestoreapi.com'),
        'cache_ttl' => (int) env('FAKESTORE_CACHE_TTL', 600),
        'timeout' => (int) env('FAKESTORE_TIMEOUT', 5),
        'currency' => env('FAKESTORE_CURRENCY', 'USD'), // Fake Store prices carry no currency
    ],

    // "GIVEN I have chosen 5 products to be top rated"
    'featured_count' => 5,

    // How many "top rated" products a category page shows above the rest.
    'category_top_rated_count' => 3,

    // Where enquiry emails go.
    'sales_inbox' => env('SALES_INBOX_ADDRESS', 'sales@example.com'),

];
