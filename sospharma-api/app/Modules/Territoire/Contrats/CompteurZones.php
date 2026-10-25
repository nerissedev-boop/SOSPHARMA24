<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Contrats;

/**
 * Compteurs par zone (pharmacies actives, pharmacies de garde maintenant).
 * Territoire ne connaît pas les pharmacies : le module Pharmacies fournit l'implémentation.
 */
interface CompteurZones
{
    /**
     * @param  list<int>  $zoneIds
     * @return array<int, array{pharmacies: int, gardes: int}> indexé par id interne de zone
     */
    public function compter(array $zoneIds): array;
}
