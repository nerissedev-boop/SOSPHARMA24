<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Enums;

enum StatutSignalement: string
{
    case Nouveau = 'nouveau';
    case Traite = 'traite';
    case Rejete = 'rejete';
}
