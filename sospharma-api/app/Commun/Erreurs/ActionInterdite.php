<?php

declare(strict_types=1);

namespace App\Commun\Erreurs;

final class ActionInterdite extends ExceptionMetier
{
    public function codeErreur(): CodeErreur
    {
        return CodeErreur::Forbidden;
    }
}
