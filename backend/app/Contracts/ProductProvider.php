<?php

namespace App\Contracts;

use App\Data\Product;
use App\Exceptions\CatalogueUnavailableException;

/**
 * Where product data comes from. Which implementation is used is decided by
 * config/catalogue.php (see AppServiceProvider). Nothing else changes.
 *
 * Implementations return our own Product/Category objects and throw
 * CatalogueUnavailableException when the source fails.
 *
 * @throws CatalogueUnavailableException
 */
interface ProductProvider
{
    /** @return list<Product> */
    public function all(): array;

    public function find(string $id): ?Product;

    /** @return list<Product> Products matching every word of the term. */
    public function search(string $term): array;
}
