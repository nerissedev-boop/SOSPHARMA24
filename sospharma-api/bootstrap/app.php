<?php

declare(strict_types=1);

use App\Commun\Erreurs\RenduErreursApi;
use App\Commun\Http\Middleware\DefinirLangue;
use App\Commun\Http\Middleware\RequestId;
use App\Commun\Http\Middleware\VerifierRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Le request_id est posé avant tout le reste (y compris le mode maintenance),
        // pour que même une réponse 503 le porte.
        $middleware->prepend(RequestId::class);
        $middleware->append(DefinirLangue::class);

        $middleware->alias([
            'role' => VerifierRole::class,
        ]);

        // API sans état : jetons Sanctum uniquement, pas de session ni de cookie.
        $middleware->throttleApi('api');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        RenduErreursApi::configurer($exceptions);
    })->create();
