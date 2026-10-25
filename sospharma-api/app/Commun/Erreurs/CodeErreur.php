<?php

declare(strict_types=1);

namespace App\Commun\Erreurs;

/**
 * Liste fermée des codes d'erreur de l'API (voir « Codes d'erreur » du document d'architecture).
 * Un nouveau code s'ajoute d'abord au document, puis ici.
 */
enum CodeErreur: string
{
    case BadRequest = 'BAD_REQUEST';
    case Unauthenticated = 'UNAUTHENTICATED';
    case Forbidden = 'FORBIDDEN';
    case NotFound = 'NOT_FOUND';
    case Conflict = 'CONFLICT';
    case ValidationFailed = 'VALIDATION_FAILED';
    case ZoneNotCovered = 'ZONE_NOT_COVERED';
    case TooManyRequests = 'TOO_MANY_REQUESTS';
    case ServerError = 'SERVER_ERROR';
    case Maintenance = 'MAINTENANCE';

    public function statutHttp(): int
    {
        return match ($this) {
            self::BadRequest => 400,
            self::Unauthenticated => 401,
            self::Forbidden => 403,
            self::NotFound => 404,
            self::Conflict => 409,
            self::ValidationFailed, self::ZoneNotCovered => 422,
            self::TooManyRequests => 429,
            self::ServerError => 500,
            self::Maintenance => 503,
        };
    }

    public function messageParDefaut(): string
    {
        return match ($this) {
            self::BadRequest => 'La requête est mal formée.',
            self::Unauthenticated => 'Veuillez vous connecter.',
            self::Forbidden => 'Accès refusé.',
            self::NotFound => 'Élément introuvable.',
            self::Conflict => 'Cette opération entre en conflit avec des données existantes.',
            self::ValidationFailed => 'Certaines informations sont invalides.',
            self::ZoneNotCovered => 'Cette zone n\'est pas encore couverte.',
            self::TooManyRequests => 'Trop de demandes. Réessayez plus tard.',
            self::ServerError => 'Un problème est survenu. Réessayez dans quelques instants.',
            self::Maintenance => 'Mise à jour en cours. Réessayez dans quelques minutes.',
        };
    }

    /** Code correspondant à un statut HTTP quelconque (pour les exceptions du framework). */
    public static function depuisStatutHttp(int $statut): self
    {
        return match (true) {
            $statut === 401 => self::Unauthenticated,
            $statut === 403 => self::Forbidden,
            $statut === 404 => self::NotFound,
            $statut === 409 => self::Conflict,
            $statut === 422 => self::ValidationFailed,
            $statut === 429 => self::TooManyRequests,
            $statut === 503 => self::Maintenance,
            $statut >= 500 => self::ServerError,
            default => self::BadRequest, // 400, 405, 413, 415, 419…
        };
    }
}
