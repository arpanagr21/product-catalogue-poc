<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** The product source failed (down, timed out, returned junk). Rendered as a 502. */
class CatalogueUnavailableException extends RuntimeException
{
    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'The product catalogue is temporarily unavailable. Please try again shortly.',
        ], 502);
    }
}
