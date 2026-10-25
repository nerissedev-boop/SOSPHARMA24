<?php

declare(strict_types=1);

namespace App\Commun\Erreurs;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\Middleware\RequestId;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Filet global : toute exception levée sur une route api/* ressort dans l'enveloppe standard,
 * et chaque journal porte le request_id.
 */
final class RenduErreursApi
{
    public static function configurer(Exceptions $exceptions): void
    {
        // Les exceptions métier sont des cas prévus : pas de trace d'erreur dans les journaux.
        $exceptions->dontReport([ExceptionMetier::class]);

        $exceptions->context(fn (): array => ['request_id' => RequestId::courant()]);

        $exceptions->render(function (Throwable $e, Request $request): ?Response {
            if (! $request->is('api/*')) {
                return null;
            }

            return self::versReponse($e);
        });
    }

    public static function versReponse(Throwable $e): Response
    {
        // Réponse déjà construite (ex. limiteur de débit avec message dédié, construit par ApiResponse).
        if ($e instanceof HttpResponseException) {
            return $e->getResponse();
        }

        if ($e instanceof ExceptionMetier) {
            return ApiResponse::error($e->codeErreur(), $e->getMessage(), $e->details(), $e->statutHttp());
        }

        if ($e instanceof ValidationException) {
            return ApiResponse::error(
                CodeErreur::ValidationFailed,
                CodeErreur::ValidationFailed->messageParDefaut(),
                $e->errors(),
                $e->status,
            );
        }

        if ($e instanceof AuthenticationException) {
            return ApiResponse::error(CodeErreur::Unauthenticated);
        }

        if ($e instanceof HttpExceptionInterface) {
            $statut = $e->getStatusCode();
            $code = CodeErreur::depuisStatutHttp($statut);
            $message = match ($statut) {
                405 => 'Méthode non autorisée pour cette adresse.',
                413 => 'Le fichier envoyé est trop volumineux.',
                default => $code->messageParDefaut(),
            };

            return ApiResponse::error($code, $message, null, $statut, $e->getHeaders());
        }

        // Panne imprévue : jamais de détail technique en production.
        $details = config('app.debug') ? [
            'exception' => $e::class,
            'message' => $e->getMessage(),
            'fichier' => $e->getFile().':'.$e->getLine(),
        ] : null;

        return ApiResponse::error(CodeErreur::ServerError, null, $details);
    }
}
