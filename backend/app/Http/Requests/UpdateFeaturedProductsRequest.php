<?php

namespace App\Http\Requests;

use App\Services\ProductService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFeaturedProductsRequest extends FormRequest
{
    public function rules(): array
    {
        $count = config('catalogue.featured_count');

        return [
            'product_ids' => ['required', 'array', "size:{$count}"],
            'product_ids.*' => ['required', 'string', 'distinct'],
        ];
    }

    public function messages(): array
    {
        return [
            'product_ids.size' => 'Choose exactly :size featured products.',
        ];
    }

    /** Every ID must exist in the active provider. */
    public function after(ProductService $products): array
    {
        return [
            function (Validator $validator) use ($products) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                foreach ($this->input('product_ids') as $index => $id) {
                    if ($products->find((string) $id) === null) {
                        $validator->errors()->add("product_ids.{$index}", "Product {$id} does not exist.");
                    }
                }
            },
        ];
    }

    /** @return list<string> */
    public function productIds(): array
    {
        return array_map('strval', $this->validated('product_ids'));
    }
}
