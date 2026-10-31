<?php

declare(strict_types=1);

namespace App\Commun\Geo;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Durée d'un trajet en voiture (taxi) par l'API Routes de Google, trafic compris.
 *
 * Sans clé (GOOGLE_ROUTES_API_KEY vide) ou en cas d'erreur, renvoie null : l'app garde alors son
 * estimation à partir de la distance. Le départ est arrondi à environ 100 m et la réponse gardée
 * 10 minutes, ce que permettent les conditions de Google (cache temporaire, pas de stockage durable).
 */
final class TrajetVoiture
{
    private const URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    public const DUREE_CACHE_S = 600;

    /** @return array{minutes: int, distance_m: int}|null */
    public function calculer(float $latDepart, float $lngDepart, float $latArrivee, float $lngArrivee): ?array
    {
        $cle = (string) config('services.google_routes.cle');
        if ($cle === '') {
            return null;
        }

        $depart = [round($latDepart, 3), round($lngDepart, 3)];
        $cache = sprintf('trajet-voiture:%s,%s:%s,%s', $depart[0], $depart[1], round($latArrivee, 5), round($lngArrivee, 5));
        $enCache = Cache::get($cache);
        if (is_array($enCache)) {
            /** @var array{minutes: int, distance_m: int} */
            return $enCache;
        }

        try {
            $reponse = Http::withHeaders([
                'X-Goog-Api-Key' => $cle,
                // Seuls ces champs sont facturés et renvoyés.
                'X-Goog-FieldMask' => 'routes.duration,routes.distanceMeters',
            ])->timeout(8)->post(self::URL, [
                'origin' => ['location' => ['latLng' => ['latitude' => $depart[0], 'longitude' => $depart[1]]]],
                'destination' => ['location' => ['latLng' => ['latitude' => $latArrivee, 'longitude' => $lngArrivee]]],
                'travelMode' => 'DRIVE',
                'routingPreference' => config('services.google_routes.trafic', true) ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE',
            ]);
            if (! $reponse->successful()) {
                Log::warning('Routes Google : réponse '.$reponse->status(), ['corps' => mb_substr($reponse->body(), 0, 300)]);

                return null;
            }
            $route = $reponse->json('routes.0');
            if (! is_array($route) || ! isset($route['duration'], $route['distanceMeters'])) {
                return null;
            }
            $resultat = [
                // « 754s » → 13 min (arrondi au-dessus, au moins 1).
                'minutes' => max(1, (int) ceil(((int) rtrim((string) $route['duration'], 's')) / 60)),
                'distance_m' => (int) $route['distanceMeters'],
            ];
        } catch (Throwable $e) {
            Log::warning('Routes Google indisponible : '.$e->getMessage());

            return null;
        }

        Cache::put($cache, $resultat, self::DUREE_CACHE_S);

        return $resultat;
    }
}
