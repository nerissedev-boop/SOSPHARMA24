<?php

declare(strict_types=1);

namespace App\Modules\Releves\Services;

use App\Commun\Geo\Distance;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Pharmacies\Contrats\FichePharmacie;

/**
 * Pharmacies connues autour d'une position (doublons possibles d'un relevé).
 * Présélection par rectangle (index latitude/longitude) puis distance exacte par haversine (Commun\Geo\Distance).
 */
final class DetectionDoublons
{
    public const RAYON_M = 100;

    public const LIMITE_DEFAUT = 20;

    public const LIMITE_MAX = 50;

    public function __construct(private readonly EditionFichesPharmacies $fiches) {}

    /** @return list<array{fiche: FichePharmacie, distance_m: int}> triées par distance croissante */
    public function autour(float $lat, float $lng, int $rayonM = self::RAYON_M, int $limite = self::LIMITE_DEFAUT, ?int $sauf = null): array
    {
        $candidats = $this->fiches->dansRectangle(Distance::rectangle($lat, $lng, $rayonM));

        $proches = [];
        foreach ($candidats as $fiche) {
            if ($fiche->id === $sauf) {
                continue;
            }
            $distance = Distance::metres($lat, $lng, $fiche->latitude, $fiche->longitude);
            if ($distance <= $rayonM) {
                $proches[] = ['fiche' => $fiche, 'distance_m' => $distance];
            }
        }
        usort($proches, fn (array $a, array $b): int => $a['distance_m'] <=> $b['distance_m']);

        return array_slice($proches, 0, $limite);
    }
}
