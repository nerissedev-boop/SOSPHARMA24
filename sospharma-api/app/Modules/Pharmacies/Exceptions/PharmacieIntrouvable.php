<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class PharmacieIntrouvable extends ExceptionMetier
{
    public function __construct(string $message = 'Cette pharmacie est introuvable.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::NotFound;
    }
}
