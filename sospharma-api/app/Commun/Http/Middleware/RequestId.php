<?php

declare(strict_types=1);

namespace App\Commun\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Symfony\Component\HttpFoundation\Response;

/**
 * Donne à chaque requête un identifiant « req_… », écrit dans les journaux (via Context),
 * dans meta.request_id et dans l'en-tête X-Request-Id.
 */
final class RequestId
{
    public const ENTETE = 'X-Request-Id';

    public function handle(Request $request, Closure $next): Response
    {
        $recu = (string) $request->headers->get(self::ENTETE, '');
        $id = preg_match('/^[A-Za-z0-9_\-]{8,64}$/', $recu) === 1 ? $recu : self::nouveau();
        Context::add('request_id', $id);

        $reponse = $next($request);
        $reponse->headers->set(self::ENTETE, $id);

        return $reponse;
    }

    public static function courant(): string
    {
        $id = Context::get('request_id');
        if (! is_string($id) || $id === '') {
            $id = self::nouveau();
            Context::add('request_id', $id);
        }

        return $id;
    }

    private static function nouveau(): string
    {
        return 'req_'.bin2hex(random_bytes(6));
    }
}
