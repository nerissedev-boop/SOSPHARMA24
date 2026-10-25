<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class PaysIntrouvable extends ExceptionMetier
{
    public function __construct(string $message = 'Pays introuvable.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::NotFound;
    }
}
