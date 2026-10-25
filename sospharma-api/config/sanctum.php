<?php

declare(strict_types=1);

use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;

return [
    // API sans état : uniquement des jetons « Bearer », aucun domaine authentifié par cookie.
    'stateful' => [],

    // Aucun garde de session consulté avant le jeton.
    'guard' => [],

    // Durée de vie des jetons, en minutes (30 jours par défaut).
    'expiration' => (int) env('SANCTUM_EXPIRATION', 60 * 24 * 30),

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', 'sp_'),

    'middleware' => [
        'authenticate_session' => AuthenticateSession::class,
        'encrypt_cookies' => EncryptCookies::class,
        'validate_csrf_token' => ValidateCsrfToken::class,
    ],
];
