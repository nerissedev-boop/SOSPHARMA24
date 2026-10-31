<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Enums;

/** Statuts fixes d'une pharmacie, par ordre de priorité. */
enum StatutOuverture: string
{
    case Garde = 'garde';
    case Ouverte = 'ouverte';
    case Fermee = 'fermee';
    /** Ni garde, ni 24h/24, ni horaires connus (fiche importée, pas encore relevée) : « Horaires à confirmer ». */
    case Inconnue = 'inconnue';
}
