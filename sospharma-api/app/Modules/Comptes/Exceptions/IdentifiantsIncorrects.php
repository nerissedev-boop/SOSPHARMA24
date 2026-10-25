<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class IdentifiantsIncorrects extends ExceptionMetier
{
    public function __construct()
    {
        parent::__construct('E-mail ou mot de passe incorrect.', ['email' => ['E-mail ou mot de passe incorrect.']]);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::ValidationFailed;
    }
}
