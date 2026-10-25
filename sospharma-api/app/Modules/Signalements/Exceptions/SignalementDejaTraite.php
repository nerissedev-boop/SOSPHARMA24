<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class SignalementDejaTraite extends ExceptionMetier
{
    public function __construct(string $message = 'Ce signalement a déjà été traité.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::Conflict;
    }
}
