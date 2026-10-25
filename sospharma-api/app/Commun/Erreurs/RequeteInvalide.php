<?php

declare(strict_types=1);

namespace App\Commun\Erreurs;

/** Paramètre non autorisé (filtre, tri, recherche, pagination hors limites…). */
final class RequeteInvalide extends ExceptionMetier
{
    public function codeErreur(): CodeErreur
    {
        return CodeErreur::BadRequest;
    }
}
