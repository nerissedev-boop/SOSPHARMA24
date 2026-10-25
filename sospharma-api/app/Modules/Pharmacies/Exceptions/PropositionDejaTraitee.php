<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class PropositionDejaTraitee extends ExceptionMetier
{
    public function __construct(string $message = 'Cette proposition d\'assurance a déjà été traitée.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::Conflict;
    }
}
