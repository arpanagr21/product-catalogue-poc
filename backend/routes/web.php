<?php

use Illuminate\Support\Facades\Route;

// API-only app; the UI lives in /frontend. Sanctum registers /sanctum/csrf-cookie itself.
Route::get('/', fn () => ['name' => config('app.name'), 'status' => 'ok']);
