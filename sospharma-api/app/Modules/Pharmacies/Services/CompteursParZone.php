<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Contrats\SourcePeriodesGarde;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Contrats\CompteurZones;

/** Fournit à Territoire le nombre de pharmacies et de gardes par zone. */
final class CompteursParZone implements CompteurZones
{
    public function __construct(private readonly SourcePeriodesGarde $gardes) {}

    public function compter(array $zoneIds): array
    {
        $resultat = array_fill_keys($zoneIds, ['pharmacies' => 0, 'gardes' => 0]);
        if ($zoneIds === []) {
            return $resultat;
        }

        $pharmacies = Pharmacie::query()->actives()->whereIn('zone_id', $zoneIds)->pluck('zone_id', 'id');
        foreach ($pharmacies as $zoneId) {
            $resultat[$zoneId]['pharmacies']++;
        }

        foreach ($this->gardes->pharmaciesDeGarde(Dates::maintenant()) as $pharmacieId => $periode) {
            $zoneId = $pharmacies[$pharmacieId] ?? null;
            if ($zoneId !== null) {
                $resultat[$zoneId]['gardes']++;
            }
        }

        return $resultat;
    }
}
