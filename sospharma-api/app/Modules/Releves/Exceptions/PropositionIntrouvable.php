<?php

declare(strict_types=1);

namespace App\Modules\Releves\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

/** Proposition inconnue, ou envoyée par un autre appareil (même réponse, pour ne rien révéler). */
final class PropositionIntrouvable extends ExceptionMetier
{
    public function __construct(string $message = 'Cette proposition est introuvable.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::NotFound;
    }
}
