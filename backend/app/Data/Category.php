<?php

namespace App\Data;

use Illuminate\Support\Str;
use JsonSerializable;

final readonly class Category implements JsonSerializable
{
    public function __construct(
        public string $slug,
        public string $name,
    ) {}

    /** "men's clothing" -> slug "mens-clothing", name "Men's clothing" */
    public static function fromName(string $name): self
    {
        return new self(Str::slug(str_replace("'", '', $name)), Str::ucfirst($name));
    }

    public function jsonSerialize(): array
    {
        return ['slug' => $this->slug, 'name' => $this->name];
    }
}
