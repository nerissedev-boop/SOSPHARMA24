<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class TourGardeIntrouvable extends ExceptionMetier
{
    /** @param array<string, mixed>|null $details */
    public function __construct(string $message = 'Tour de garde introuvable.', ?array $details = null)
    {
        parent::__construct($message, $details);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::NotFound;
    }
}
