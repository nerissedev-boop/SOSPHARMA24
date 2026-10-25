<?php

declare(strict_types=1);

namespace App\Commun\Erreurs;

/**
 * Erreur de validation produite par un traitement (import CSV, GeoJSON…) plutôt que par une Form Request.
 * Les détails sont renvoyés dans error.details.
 */
final class DonneesInvalides extends ExceptionMetier
{
    public function codeErreur(): CodeErreur
    {
        return CodeErreur::ValidationFailed;
    }
}
