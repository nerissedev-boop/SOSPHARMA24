<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Exceptions;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Erreurs\ExceptionMetier;

final class TourGardeNonModifiable extends ExceptionMetier
{
    /** @param array<string, mixed>|null $details */
    public function __construct(string $message = 'Un tour publié ne peut plus être modifié ni supprimé.', ?array $details = null)
    {
        parent::__construct($message, $details);
    }

    public function codeErreur(): CodeErreur
    {
        return CodeErreur::Conflict;
    }
}
