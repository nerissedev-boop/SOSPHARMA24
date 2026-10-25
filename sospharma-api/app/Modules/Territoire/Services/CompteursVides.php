<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Services;

use App\Modules\Territoire\Contrats\CompteurZones;

/** Implémentation par défaut tant qu'aucun module ne fournit de compteurs. */
final class CompteursVides implements CompteurZones
{
    public function compter(array $zoneIds): array
    {
        return array_fill_keys($zoneIds, ['pharmacies' => 0, 'gardes' => 0]);
    }
}
