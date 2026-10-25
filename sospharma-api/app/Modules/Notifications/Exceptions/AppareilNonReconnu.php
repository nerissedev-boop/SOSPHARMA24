<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

/** En-tête X-Device-Token absent ou inconnu : l'app doit réenregistrer l'appareil. */
final class AppareilNonReconnu extends ExceptionMetier
{
    public function __construct(string $message = 'Appareil non reconnu. Relancez l\'application.')
    {
        parent::__construct($message);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::Unauthenticated;
    }
}
