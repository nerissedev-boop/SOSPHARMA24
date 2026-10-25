<?php

declare(strict_types=1);

namespace App\Modules\Support\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class MessageIntrouvable extends ExceptionMetier
{
    public function __construct(string $message = 'Message introuvable.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::NotFound;
    }
}
