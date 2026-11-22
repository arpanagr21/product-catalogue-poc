<?php

namespace App\Data;

use JsonSerializable;

final readonly class Product implements JsonSerializable
{
    public function __construct(
        public string $id, // string so SKUs/UUIDs from other providers fit
        public string $title,
        public string $description,
        public float $price,
        public string $currency,
        public string $imageUrl, // the provider's URL; clients get our proxy URL instead
        public Category $category,
        public ?float $rating = null, // not every provider has ratings
        public ?int $ratingCount = null,
    ) {}

    /** Does the text contain every word of the term? (case-insensitive) */
    public function matches(string $term): bool
    {
        $text = mb_strtolower("{$this->title} {$this->description} {$this->category->name}");
        $words = preg_split('/\s+/', mb_strtolower(trim($term)), -1, PREG_SPLIT_NO_EMPTY);

        foreach ($words as $word) {
            if (! str_contains($text, $word)) {
                return false;
            }
        }

        return $words !== [];
    }

    /** The API shape the frontend relies on (frontend/src/types/catalogue.ts). */
    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'price' => $this->price,
            'currency' => $this->currency,
            'image' => $this->imageUrl === '' ? null : url('/api/products/'.rawurlencode($this->id).'/image'),
            'category' => $this->category,
            'rating' => $this->rating === null ? null : ['rate' => $this->rating, 'count' => $this->ratingCount ?? 0],
        ];
    }
}
