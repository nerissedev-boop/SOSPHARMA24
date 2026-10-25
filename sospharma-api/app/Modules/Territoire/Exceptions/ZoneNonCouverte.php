<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class ZoneNonCouverte extends ExceptionMetier
{
    public function codeErreur(): CodeErreur
    {
        return CodeErreur::ZoneNotCovered;
    }
}
