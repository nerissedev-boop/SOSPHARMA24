<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Geo\Distance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Services\ZoneDepuisPosition;
use Illuminate\Support\Str;

/**
 * Import des pharmacies d'OpenStreetMap (réponse JSON d'Overpass, `out tags center`).
 *
 * Données sous licence ODbL : « © les contributeurs d'OpenStreetMap ». Les fiches créées restent
 * « pas encore vérifiées » (verifiee_le nul) jusqu'au passage d'un agent ou du pharmacien.
 *
 * Relançable : un élément déjà importé (osm_id) n'est mis à jour que tant que la fiche n'est pas
 * vérifiée ; une fiche existante proche et de même nom est rattachée au lieu d'être dupliquée.
 */
final class ImportPharmaciesOsm
{
    /** Au-delà, deux points ne désignent pas la même officine. */
    public const RAYON_DOUBLON_M = 80;

    public const ADRESSE_INCONNUE = 'Adresse à vérifier';

    /** Identifiants des fiches fictives de PharmaciesTestSeeder (ph_test01 à ph_test20). */
    public const PREFIXE_DONNEES_TEST = 'ph_test';

    public function __construct(private readonly ZoneDepuisPosition $zones) {}

    /**
     * @param  list<array<string, mixed>>  $elements  éléments Overpass (type, id, lat/lon ou center, tags)
     * @return array{creees: int, mises_a_jour: int, rattachees: int, verifiees_intactes: int, sans_nom: int, hors_zone: int}
     */
    public function importer(array $elements, bool $simulation = false): array
    {
        $bilan = ['creees' => 0, 'mises_a_jour' => 0, 'rattachees' => 0, 'verifiees_intactes' => 0, 'sans_nom' => 0, 'hors_zone' => 0];

        foreach ($elements as $element) {
            $tags = (array) ($element['tags'] ?? []);
            $position = $this->position($element);
            $nom = $this->nom($tags);
            if ($nom === null) {
                $bilan['sans_nom']++;

                continue;
            }
            if ($position === null || ($zone = $this->zones->chercher($position[0], $position[1])) === null) {
                $bilan['hors_zone']++;

                continue;
            }

            $osmId = substr((string) $element['type'], 0, 1).$element['id'];
            $attributs = [
                'nom' => $nom,
                'latitude' => $position[0],
                'longitude' => $position[1],
                'ville_id' => $zone->ville->id,
                'zone_id' => $zone->commune->id,
            ];
            $complements = array_filter([
                'adresse' => $this->adresse($tags),
                'quartier' => $this->texte($tags['addr:suburb'] ?? null, 100),
                'telephone' => $this->telephone($tags['phone'] ?? $tags['contact:phone'] ?? null, (string) $zone->ville->pays->indicatif),
                'h24' => ($tags['opening_hours'] ?? null) === '24/7' ? true : null,
            ], fn (mixed $v): bool => $v !== null);

            $existante = Pharmacie::query()->where('osm_id', $osmId)->first();
            if ($existante !== null) {
                if ($existante->verifiee_le !== null) {
                    $bilan['verifiees_intactes']++;

                    continue;
                }
                $bilan['mises_a_jour']++;
                if (! $simulation) {
                    $existante->update($attributs + $this->seulementVides($existante, $complements));
                }

                continue;
            }

            $doublon = $this->doublonProche($nom, $position[0], $position[1]);
            if ($doublon !== null) {
                $bilan['rattachees']++;
                if (! $simulation) {
                    // Une fiche saisie par l'équipe garde son nom et sa position : on complète seulement les vides.
                    $doublon->update(['osm_id' => $osmId] + $this->seulementVides($doublon, $complements));
                }

                continue;
            }

            $bilan['creees']++;
            if (! $simulation) {
                Pharmacie::query()->create($attributs + $complements + [
                    'osm_id' => $osmId,
                    'adresse' => self::ADRESSE_INCONNUE,
                    'h24' => false,
                    'actif' => true,
                ]);
            }
        }

        return $bilan;
    }

    /**
     * Retire des listes les pharmacies fictives du jeu de test, pour qu'elles ne se mêlent pas aux vraies.
     * Elles restent en base (le seeder les réactive s'il est relancé).
     */
    public function desactiverDonneesTest(bool $simulation = false): int
    {
        $requete = Pharmacie::query()->where('id_public', 'like', self::PREFIXE_DONNEES_TEST.'%')->where('actif', true);

        return $simulation ? $requete->count() : $requete->update(['actif' => false]);
    }

    /** @return array{0: float, 1: float}|null */
    private function position(array $element): ?array
    {
        $point = isset($element['lat'], $element['lon']) ? $element : ($element['center'] ?? null);

        return is_array($point) && isset($point['lat'], $point['lon']) ? [(float) $point['lat'], (float) $point['lon']] : null;
    }

    private function nom(array $tags): ?string
    {
        $nom = $this->texte($tags['name'] ?? $tags['name:fr'] ?? null, 150);
        if ($nom === null) {
            return null;
        }

        // « Grande Pharmacie du Plateau » reste tel quel ; « du Plateau » devient « Pharmacie du Plateau ».
        return Str::contains(Str::lower(Str::ascii($nom)), 'pharma') ? $nom : Str::limit('Pharmacie '.$nom, 150, '');
    }

    private function adresse(array $tags): ?string
    {
        $complete = $this->texte($tags['addr:full'] ?? null, 255);
        if ($complete !== null) {
            return $complete;
        }
        $rue = $this->texte($tags['addr:street'] ?? null, 230);

        return $rue === null ? null : trim(($tags['addr:housenumber'] ?? '').' '.$rue);
    }

    /** Format E.164 (« +2252722445566 »), sinon null ; seul le premier numéro est gardé. */
    private function telephone(mixed $brut, string $indicatif): ?string
    {
        if (! is_string($brut) || $brut === '') {
            return null;
        }
        $premier = preg_split('/[;,\/]/', $brut)[0] ?? '';
        $chiffres = preg_replace('/\D/', '', $premier) ?? '';
        $prefixe = ltrim($indicatif, '+');
        if (str_starts_with(trim($premier), '+') || str_starts_with($chiffres, '00')) {
            $chiffres = ltrim($chiffres, '0');
        } elseif ($prefixe !== '' && ! str_starts_with($chiffres, $prefixe)) {
            $chiffres = $prefixe.$chiffres;
        }

        return strlen($chiffres) >= 8 && strlen($chiffres) <= 15 ? '+'.$chiffres : null;
    }

    private function texte(mixed $valeur, int $max): ?string
    {
        if (! is_string($valeur)) {
            return null;
        }
        $propre = trim(preg_replace('/\s+/', ' ', $valeur) ?? '');

        return $propre === '' ? null : Str::limit($propre, $max, '');
    }

    /**
     * @param  array<string, mixed>  $complements
     * @return array<string, mixed>
     */
    private function seulementVides(Pharmacie $pharmacie, array $complements): array
    {
        return array_filter($complements, function (mixed $valeur, string $champ) use ($pharmacie): bool {
            $actuel = $pharmacie->getAttribute($champ);

            return $actuel === null || $actuel === '' || $actuel === false || $actuel === self::ADRESSE_INCONNUE;
        }, ARRAY_FILTER_USE_BOTH);
    }

    private function doublonProche(string $nom, float $lat, float $lng): ?Pharmacie
    {
        $rectangle = Distance::rectangle($lat, $lng, self::RAYON_DOUBLON_M);
        $cle = $this->cleNom($nom);

        return Pharmacie::query()
            ->whereNull('osm_id')
            ->whereBetween('latitude', [$rectangle->minLat, $rectangle->maxLat])
            ->whereBetween('longitude', [$rectangle->minLng, $rectangle->maxLng])
            ->get()
            ->first(fn (Pharmacie $p): bool => Distance::metres($lat, $lng, (float) $p->lat(), (float) $p->lng()) <= self::RAYON_DOUBLON_M
                && ($cle === '' || $this->cleNom($p->nom) === '' || str_contains($this->cleNom($p->nom), $cle) || str_contains($cle, $this->cleNom($p->nom))));
    }

    /** « Grande Pharmacie de l'Étoile » → « etoile » : on compare les noms sans les mots communs. */
    private function cleNom(string $nom): string
    {
        $mots = preg_split('/[^a-z0-9]+/', Str::lower(Str::ascii($nom))) ?: [];
        $vides = ['pharmacie', 'pharma', 'grande', 'la', 'le', 'les', 'de', 'du', 'des', 'l', 'd', 'et', 'nouvelle'];

        return implode(' ', array_values(array_filter($mots, fn (string $m): bool => $m !== '' && ! in_array($m, $vides, true))));
    }
}
