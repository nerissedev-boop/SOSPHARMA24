<?php

declare(strict_types=1);

namespace App\Commun\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Langue des messages de l'API d'après l'en-tête Accept-Language envoyé par l'app.
 * Français par défaut ; l'anglais vient de lang/en.json (clé = phrase française).
 */
final class DefinirLangue
{
    public const LANGUES = ['fr', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        // Toujours fixée : les messages du code sont en français, quelle que soit APP_LOCALE.
        $langue = $request->headers->has('Accept-Language') ? $request->getPreferredLanguage(self::LANGUES) : null;
        app()->setLocale($langue ?? 'fr');

        $reponse = $next($request);
        $reponse->headers->set('Content-Language', app()->getLocale());

        return $reponse;
    }
}
