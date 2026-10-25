<?php

declare(strict_types=1);

namespace App\Commun\Geo;

use InvalidArgumentException;

/**
 * Géométrie GeoJSON en PHP pur (Polygon et MultiPolygon). Coordonnées GeoJSON : [longitude, latitude].
 */
final class Geometrie
{
    /**
     * Extrait la géométrie d'un objet GeoJSON (Feature ou géométrie nue) et vérifie sa forme.
     *
     * @param  array<string, mixed>  $geojson
     * @return array{type: 'Polygon'|'MultiPolygon', coordinates: array<mixed>}
     */
    public static function normaliser(array $geojson): array
    {
        if (($geojson['type'] ?? null) === 'Feature') {
            $geojson = is_array($geojson['geometry'] ?? null) ? $geojson['geometry'] : [];
        }

        $type = $geojson['type'] ?? null;
        $coordonnees = $geojson['coordinates'] ?? null;
        if (! in_array($type, ['Polygon', 'MultiPolygon'], true) || ! is_array($coordonnees) || $coordonnees === []) {
            throw new InvalidArgumentException('Le contour doit être un Polygon ou un MultiPolygon GeoJSON.');
        }

        $polygones = $type === 'Polygon' ? [$coordonnees] : $coordonnees;
        foreach ($polygones as $polygone) {
            if (! is_array($polygone) || $polygone === []) {
                throw new InvalidArgumentException('Polygone vide dans le contour.');
            }
            foreach ($polygone as $anneau) {
                if (! is_array($anneau) || count($anneau) < 4) {
                    throw new InvalidArgumentException('Chaque anneau doit compter au moins 4 positions.');
                }
                foreach ($anneau as $position) {
                    if (! is_array($position) || count($position) < 2 || ! is_numeric($position[0]) || ! is_numeric($position[1])
                        || abs((float) $position[0]) > 180 || abs((float) $position[1]) > 90) {
                        throw new InvalidArgumentException('Position invalide dans le contour (attendu [longitude, latitude]).');
                    }
                }
            }
        }

        return ['type' => $type, 'coordinates' => $coordonnees];
    }

    /** @param array<string, mixed> $geojson */
    public static function contientPoint(array $geojson, float $lat, float $lng): bool
    {
        $geometrie = self::normaliser($geojson);
        $polygones = $geometrie['type'] === 'Polygon' ? [$geometrie['coordinates']] : $geometrie['coordinates'];

        foreach ($polygones as $polygone) {
            $exterieur = array_shift($polygone);
            if (! self::pointDansAnneau($exterieur, $lat, $lng)) {
                continue;
            }
            $dansUnTrou = false;
            foreach ($polygone as $trou) {
                if (self::pointDansAnneau($trou, $lat, $lng)) {
                    $dansUnTrou = true;
                    break;
                }
            }
            if (! $dansUnTrou) {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, mixed> $geojson */
    public static function rectangleEnglobant(array $geojson): Rectangle
    {
        $geometrie = self::normaliser($geojson);
        $polygones = $geometrie['type'] === 'Polygon' ? [$geometrie['coordinates']] : $geometrie['coordinates'];
        $minLat = $minLng = INF;
        $maxLat = $maxLng = -INF;

        foreach ($polygones as $polygone) {
            foreach ($polygone[0] as $position) {
                $lng = (float) $position[0];
                $lat = (float) $position[1];
                $minLat = min($minLat, $lat);
                $maxLat = max($maxLat, $lat);
                $minLng = min($minLng, $lng);
                $maxLng = max($maxLng, $lng);
            }
        }

        return new Rectangle($minLat, $maxLat, $minLng, $maxLng);
    }

    /**
     * Test de parité (lancer de rayon). Un point exactement sur un bord peut tomber d'un côté ou de l'autre,
     * ce qui est sans conséquence pour la détection de commune.
     *
     * @param  array<int, array<int, float|int|string>>  $anneau
     */
    private static function pointDansAnneau(array $anneau, float $lat, float $lng): bool
    {
        $dedans = false;
        $n = count($anneau);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $xi = (float) $anneau[$i][0];
            $yi = (float) $anneau[$i][1];
            $xj = (float) $anneau[$j][0];
            $yj = (float) $anneau[$j][1];

            if ((($yi > $lat) !== ($yj > $lat)) && ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi)) {
                $dedans = ! $dedans;
            }
        }

        return $dedans;
    }

    /**
     * Rectangle de carte « minLng,minLat,maxLng,maxLat » (ordre GeoJSON / MapLibre).
     */
    public static function bboxDepuisChaine(string $bbox): Rectangle
    {
        $parties = explode(',', $bbox);
        if (count($parties) !== 4) {
            throw new InvalidArgumentException('bbox attend 4 coordonnées : minLng,minLat,maxLng,maxLat.');
        }
        foreach ($parties as $partie) {
            if (! is_numeric(trim($partie))) {
                throw new InvalidArgumentException('bbox ne doit contenir que des nombres.');
            }
        }
        [$minLng, $minLat, $maxLng, $maxLat] = array_map(fn (string $p): float => (float) trim($p), $parties);
        if (abs($minLat) > 90 || abs($maxLat) > 90 || abs($minLng) > 180 || abs($maxLng) > 180) {
            throw new InvalidArgumentException('bbox contient des coordonnées hors limites.');
        }

        return new Rectangle($minLat, $maxLat, $minLng, $maxLng);
    }
}
