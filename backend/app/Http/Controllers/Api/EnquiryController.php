<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEnquiryRequest;
use App\Mail\EnquiryReceived;
use App\Models\Enquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class EnquiryController extends Controller
{
    public function store(StoreEnquiryRequest $request): JsonResponse
    {
        $product = $request->product();

        // Persist first so the lead survives even if mail delivery fails.
        $enquiry = Enquiry::create([
            ...$request->safe()->only(['name', 'email', 'phone', 'message']),
            'product_id' => $product->id,
            'product_title' => $product->title,
        ]);

        Mail::to(config('catalogue.sales_inbox'))->queue(new EnquiryReceived($enquiry));

        return response()->json([
            'data' => ['id' => $enquiry->id],
            'message' => 'Thank you! Our sales team will be in touch shortly.',
        ], 201);
    }
}
