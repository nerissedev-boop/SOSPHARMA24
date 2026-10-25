<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// L'API n'a pas de pages web : la racine renvoie vers la documentation.
Route::get('/', fn () => response()->json([
    'application' => 'SOS Pharma 24 API',
    'documentation' => url('/docs/api'),
]));
