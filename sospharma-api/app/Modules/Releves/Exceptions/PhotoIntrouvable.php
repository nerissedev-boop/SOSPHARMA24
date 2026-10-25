<?php

declare(strict_types=1);

namespace App\Modules\Releves\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class PhotoIntrouvable extends ExceptionMetier
{
    public function __construct(string $message = 'Cette photo est introuvable.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::NotFound;
    }
}
