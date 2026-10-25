<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Geo\Geometrie;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use JsonException;
use Throwable;

/**
 * Import des contours d'une ville depuis un fichier GeoJSON (FeatureCollection).
 * Chaque Feature porte properties.nom et properties.type (commune par défaut).
 * Tout ou rien : une seule erreur annule l'import, avec la liste des erreurs par Feature.
 */
final class ImportZones
{
    /** @return array{creees: int, mises_a_jour: int} */
    public function importer(Ville $ville, UploadedFile $fichier, ?string $source = null): array
    {
        $features = $this->lire($fichier);

        $erreurs = [];
        $lignes = [];
        foreach ($features as $index => $feature) {
            $cle = 'features.'.$index;
            $nom = is_array($feature) ? trim((string) ($feature['properties']['nom'] ?? $feature['properties']['name'] ?? '')) : '';
            $type = is_array($feature) ? TypeZone::tryFrom((string) ($feature['properties']['type'] ?? 'commune')) : null;

            if ($nom === '') {
                $erreurs[$cle][] = 'La propriété « nom » est obligatoire.';
            }
            if ($type === null) {
                $erreurs[$cle][] = 'La propriété « type » doit valoir commune ou quartier.';
            }
            try {
                $geometrie = Geometrie::normaliser(is_array($feature) ? $feature : []);
            } catch (InvalidArgumentException $e) {
                $erreurs[$cle][] = $e->getMessage();

                continue;
            }
            if ($nom !== '' && $type !== null) {
                $lignes[] = ['nom' => $nom, 'type' => $type, 'contour' => $geometrie];
            }
        }

        if ($erreurs !== []) {
            throw new DonneesInvalides('Le fichier contient des erreurs : rien n\'a été importé.', $erreurs);
        }

        try {
            return DB::transaction(function () use ($ville, $lignes, $source): array {
                $bilan = ['creees' => 0, 'mises_a_jour' => 0];
                foreach ($lignes as $ligne) {
                    $zone = Zone::query()->firstOrNew([
                        'ville_id' => $ville->id,
                        'type' => $ligne['type']->value,
                        'nom' => $ligne['nom'],
                    ]);
                    $bilan[$zone->exists ? 'mises_a_jour' : 'creees']++;
                    $zone->fill(['contour' => $ligne['contour'], 'contour_source' => $source, 'actif' => true])->save();
                }

                return $bilan;
            });
        } catch (Throwable $e) {
            Log::error('Import GeoJSON annulé', ['ville' => $ville->id_public, 'erreur' => $e->getMessage()]);

            throw $e;
        }
    }

    /** @return array<int, mixed> */
    private function lire(UploadedFile $fichier): array
    {
        $contenu = @file_get_contents($fichier->getRealPath());
        if ($contenu === false) {
            Log::warning('Fichier GeoJSON illisible', ['nom' => $fichier->getClientOriginalName()]);

            throw new DonneesInvalides('Le fichier n\'a pas pu être lu.', ['fichier' => ['Fichier illisible.']]);
        }

        try {
            $json = json_decode($contenu, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new DonneesInvalides('Le fichier n\'est pas un JSON valide.', ['fichier' => [$e->getMessage()]], $e);
        }

        if (! is_array($json) || ($json['type'] ?? null) !== 'FeatureCollection' || ! is_array($json['features'] ?? null)) {
            throw new DonneesInvalides('Le fichier doit être une FeatureCollection GeoJSON.', ['fichier' => ['FeatureCollection attendue.']]);
        }

        return array_values($json['features']);
    }
}
