<?php

declare(strict_types=1);

namespace App\Commun\Geo;

/**
 * Distances sur la sphère terrestre, sans extension géographique en base.
 */
final class Distance
{
    private const RAYON_TERRE_M = 6_371_000.0;

    /** Vitesse de marche retenue pour l'estimation « temps à pied » (à afficher comme une estimation). */
    public const MARCHE_M_PAR_MIN = 80;

    /** Distance exacte (formule de haversine), en mètres. */
    public static function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * self::RAYON_TERRE_M * asin(min(1.0, sqrt($a)));
    }

    /** Distance arrondie au mètre entier (distance_m). */
    public static function metres(float $lat1, float $lng1, float $lat2, float $lng2): int
    {
        return (int) round(self::haversine($lat1, $lng1, $lat2, $lng2));
    }

    /** Estimation du temps de marche en minutes entières (marche_min), au moins 1 minute. */
    public static function marcheMinutes(int $distanceM): int
    {
        return max(1, (int) ceil($distanceM / self::MARCHE_M_PAR_MIN));
    }

    /**
     * Rectangle de présélection autour d'un point, pour filtrer vite en SQL sur l'index (latitude, longitude).
     * Le rectangle contient le cercle : on affine ensuite avec haversine().
     */
    public static function rectangle(float $lat, float $lng, float $rayonM): Rectangle
    {
        $dLat = rad2deg($rayonM / self::RAYON_TERRE_M);
        $cos = cos(deg2rad($lat));
        $dLng = $cos > 1e-9 ? rad2deg($rayonM / (self::RAYON_TERRE_M * $cos)) : 180.0;

        return new Rectangle(
            max(-90.0, $lat - $dLat),
            min(90.0, $lat + $dLat),
            max(-180.0, $lng - $dLng),
            min(180.0, $lng + $dLng),
        );
    }
}
