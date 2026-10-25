<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class CompteIntrouvable extends ExceptionMetier
{
    public function __construct(string $message = 'Compte introuvable.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::NotFound;
    }
}
