<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Services;

use App\Commun\Geo\Geometrie;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Exceptions\ZoneNonCouverte;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Support\Facades\Cache;

/**
 * Détecte la commune (et le quartier éventuel) d'une position :
 * présélection SQL par rectangle englobant indexé, puis point-dans-polygone en PHP
 * sur les contours gardés dans le cache de Laravel.
 */
final class ZoneDepuisPosition
{
    /** Cherche la zone sans lever d'exception ; null si aucune commune ne contient le point. */
    public function chercher(float $lat, float $lng): ?ResultatZone
    {
        $candidates = Zone::query()
            ->where('actif', true)
            ->contenantRectangle($lat, $lng)
            ->with('ville.pays')
            ->get(['id', 'id_public', 'ville_id', 'nom', 'type', 'centre_lat', 'centre_lng', 'actif']);

        $commune = null;
        $quartier = null;
        foreach ($candidates as $zone) {
            if (! Geometrie::contientPoint($this->contour($zone->id), $lat, $lng)) {
                continue;
            }
            if ($zone->type === TypeZone::Commune) {
                $commune ??= $zone;
            } else {
                $quartier ??= $zone;
            }
        }

        if ($commune === null) {
            return null;
        }

        return new ResultatZone($commune, $quartier, $commune->ville);
    }

    /**
     * @throws ZoneNonCouverte si la position n'est dans aucune commune connue, ou dans une ville pas encore ouverte.
     */
    public function trouver(float $lat, float $lng): ResultatZone
    {
        $resultat = $this->chercher($lat, $lng);

        if ($resultat === null) {
            throw new ZoneNonCouverte('Votre position n\'est pas encore couverte par SOS Pharma 24.');
        }

        if (! $resultat->ville->estCouverte()) {
            throw new ZoneNonCouverte(
                "{$resultat->ville->nom} n'est pas encore couverte. Elle arrive bientôt.",
                ['ville' => [$resultat->ville->id_public], 'zone' => [$resultat->commune->id_public]],
            );
        }

        return $resultat;
    }

    /** @return array<string, mixed> */
    private function contour(int $zoneId): array
    {
        /** @var array<string, mixed> */
        return Cache::rememberForever(self::cle($zoneId), fn (): array => (array) Zone::query()->whereKey($zoneId)->value('contour'));
    }

    public static function oublierContour(int $zoneId): void
    {
        Cache::forget(self::cle($zoneId));
    }

    private static function cle(int $zoneId): string
    {
        return "territoire.zone.{$zoneId}.contour";
    }
}
