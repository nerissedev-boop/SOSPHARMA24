<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Enums;

/** Statuts fixes d'une pharmacie, par ordre de priorité. */
enum StatutOuverture: string
{
    case Garde = 'garde';
    case Ouverte = 'ouverte';
    case Fermee = 'fermee';
}
