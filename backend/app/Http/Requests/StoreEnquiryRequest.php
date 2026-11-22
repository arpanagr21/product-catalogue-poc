<?php

namespace App\Http\Requests;

use App\Data\Product;
use App\Services\ProductService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreEnquiryRequest extends FormRequest
{
    private ?Product $product = null;

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32', 'regex:/^[0-9+()\-\s]{6,32}$/'],
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a valid phone number.',
        ];
    }

    /** The product must exist, so the sales email always names a real product. */
    public function after(ProductService $products): array
    {
        return [
            function (Validator $validator) use ($products) {
                if ($validator->errors()->has('product_id')) {
                    return;
                }

                $this->product = $products->find((string) $this->input('product_id'));

                if ($this->product === null) {
                    $validator->errors()->add('product_id', 'This product is no longer available.');
                }
            },
        ];
    }

    public function product(): Product
    {
        return $this->product;
    }
}
