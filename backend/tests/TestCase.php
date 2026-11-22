<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected const SPA_ORIGIN = 'http://spa.test';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'catalogue.fakestore.base_url' => 'https://fakestore.test',
            'sanctum.stateful' => ['spa.test'],
        ]);

        $this->fakeUpstream([]);
    }

    /** Replace (not stack) upstream HTTP stubs; no test may reach the real internet. */
    protected function fakeUpstream(array $stubs): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake($stubs);
    }

    /** Serve the Fake Store fixture (8 real products across 3 categories). */
    protected function fakeCatalogue(): void
    {
        $this->fakeUpstream([
            'fakestore.test/products' => Http::response(
                json_decode(file_get_contents(__DIR__.'/Fixtures/fakestore-products.json'), true),
            ),
        ]);
    }

    protected function fakeCatalogueDown(): void
    {
        $this->fakeUpstream(['fakestore.test/*' => Http::response('Bad Gateway', 502)]);
    }

    /** Make requests look like they come from the SPA, so Sanctum starts a session. */
    protected function fromSpa(): static
    {
        return $this->withHeaders(['Origin' => self::SPA_ORIGIN, 'Referer' => self::SPA_ORIGIN.'/']);
    }
}
