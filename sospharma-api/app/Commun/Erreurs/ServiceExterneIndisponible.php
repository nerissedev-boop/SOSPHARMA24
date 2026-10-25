<?php

declare(strict_types=1);

namespace App\Commun\Erreurs;

/** Un service externe (Expo Push, stockage…) n'a pas répondu correctement. */
final class ServiceExterneIndisponible extends ExceptionMetier
{
    public function codeErreur(): CodeErreur
    {
        return CodeErreur::ServerError;
    }
}
