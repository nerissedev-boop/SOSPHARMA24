<?php

declare(strict_types=1);

namespace App\Modules\Releves\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

/** Action impossible dans l'état actuel du relevé (déjà validé, rejeté, pas « à corriger »…). */
final class ReleveNonModifiable extends ExceptionMetier
{
    public function __construct(string $message = 'Ce relevé ne peut plus être modifié dans son état actuel.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::Conflict;
    }
}
