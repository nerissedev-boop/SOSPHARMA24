<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class AucunePharmacieRattachee extends ExceptionMetier
{
    public function __construct(string $message = 'Aucune pharmacie n\'est rattachée à votre compte.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::Forbidden;
    }
}
