<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

/**
 * Accès à /docs/api : libre en local ; ailleurs, authentification HTTP Basic d'un compte admin actif
 * (l'API n'a pas de session, l'équipe se connecte avec son e-mail et son mot de passe du back-office).
 */
class AccesDocumentation
{
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('local')) {
            return $next($request);
        }

        // Lève une 401 avec l'en-tête WWW-Authenticate si les identifiants manquent ou sont faux.
        Auth::guard('web')->onceBasic('email', ['actif' => true]);

        abort_unless(Gate::forUser(Auth::guard('web')->user())->allows('viewApiDocs'), 403);

        return $next($request);
    }
}
