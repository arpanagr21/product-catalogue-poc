<?php

namespace App\Providers;

use App\Contracts\ProductProvider;
use App\ProductProviders\FakeStoreProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // CATALOGUE_PROVIDER picks a class from config('catalogue.providers');
        // missing or unknown names fall back to Fake Store.
        $this->app->bind(ProductProvider::class, function ($app) {
            $class = config('catalogue.providers')[config('catalogue.provider')] ?? FakeStoreProvider::class;

            return $app->make($class);
        });
    }

    public function boot(): void
    {
        RateLimiter::for('enquiries', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));
    }
}
