<?php

declare(strict_types=1);

namespace App\Commun\Http\Middleware;

use App\Commun\Erreurs\ActionInterdite;
use App\Commun\Securite\CompteAvecRole;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage : ->middleware('role:admin,editeur_ville'). À placer après auth:sanctum.
 */
final class VerifierRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $compte = $request->user();
        if ($compte === null) {
            throw new AuthenticationException;
        }

        if (! $compte instanceof CompteAvecRole || ! $compte->estActif()) {
            throw new ActionInterdite('Ce compte est désactivé.');
        }

        if (! in_array($compte->role()->value, $roles, true)) {
            throw new ActionInterdite('Votre rôle ne permet pas cette action.');
        }

        return $next($request);
    }
}
