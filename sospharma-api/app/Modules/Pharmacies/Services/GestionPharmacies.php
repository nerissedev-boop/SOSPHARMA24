<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use App\Modules\Territoire\Services\ZoneDepuisPosition;
use Illuminate\Support\Facades\DB;

/** Écritures sur les fiches et les horaires. */
final class GestionPharmacies
{
    public function __construct(private readonly ZoneDepuisPosition $zones) {}

    /** @param array<string, mixed> $donnees validées */
    public function creer(array $donnees): Pharmacie
    {
        $attributs = $this->attributs($donnees);
        $attributs += $this->localiser($donnees, null);

        return Pharmacie::query()->create($attributs)->load(['ville', 'zone', 'horaires', 'assurances']);
    }

    /** @param array<string, mixed> $donnees validées */
    public function modifier(Pharmacie $pharmacie, array $donnees): Pharmacie
    {
        $attributs = $this->attributs($donnees);
        if (array_intersect(array_keys($donnees), ['ville', 'zone', 'latitude', 'longitude']) !== []) {
            $attributs += $this->localiser($donnees + ['latitude' => $pharmacie->lat(), 'longitude' => $pharmacie->lng()], $pharmacie);
        }
        $pharmacie->update($attributs);

        return $pharmacie->load(['ville', 'zone', 'horaires', 'assurances']);
    }

    /**
     * Zone et ville d'une position dans une ville connue (identifiant interne) : la commune qui contient
     * la position si elle est dans cette ville, sinon la ville sans commune. Sert aux relevés terrain.
     *
     * @return array{ville_id: int, zone_id: int|null}
     */
    public function localiserDansVille(float $lat, float $lng, int $villeId): array
    {
        $detectee = $this->zones->chercher($lat, $lng);

        return [
            'ville_id' => $villeId,
            'zone_id' => $detectee !== null && $detectee->ville->id === $villeId ? $detectee->commune->id : null,
        ];
    }

    /** Modification par le pharmacien lui-même : la fiche est considérée vérifiée. */
    public function modifierParPharmacien(Pharmacie $pharmacie, array $donnees): Pharmacie
    {
        $pharmacie->update(array_intersect_key($donnees, array_flip(['telephone', 'whatsapp', 'services'])) + ['verifiee_le' => now()]);

        return $pharmacie->load(['ville', 'zone', 'horaires', 'assurances']);
    }

    /**
     * Remplace toutes les plages en une transaction (tout ou rien).
     *
     * @param  list<array{jour: int, ouverture: string, fermeture: string}>  $horaires
     */
    public function remplacerHoraires(Pharmacie $pharmacie, array $horaires, ?bool $h24 = null, bool $marquerVerifiee = false): Pharmacie
    {
        DB::transaction(function () use ($pharmacie, $horaires, $h24, $marquerVerifiee): void {
            $pharmacie->horaires()->delete();
            foreach ($horaires as $plage) {
                $pharmacie->horaires()->create([
                    'jour' => (int) $plage['jour'],
                    'ouverture' => $plage['ouverture'],
                    'fermeture' => $plage['fermeture'],
                ]);
            }
            $changements = [];
            if ($h24 !== null) {
                $changements['h24'] = $h24;
            }
            if ($marquerVerifiee) {
                $changements['verifiee_le'] = now();
            }
            if ($changements !== []) {
                $pharmacie->update($changements);
            }
        });

        return $pharmacie->load(['ville', 'zone', 'horaires', 'assurances']);
    }

    public function desactiver(Pharmacie $pharmacie): Pharmacie
    {
        $pharmacie->update(['actif' => false]);

        return $pharmacie->load(['ville', 'zone', 'horaires', 'assurances']);
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @return array<string, mixed>
     */
    private function attributs(array $donnees): array
    {
        $attributs = array_intersect_key($donnees, array_flip([
            'nom', 'adresse', 'quartier', 'telephone', 'whatsapp', 'latitude', 'longitude', 'h24', 'services', 'actif',
        ]));
        if (($donnees['verifiee'] ?? false) === true) {
            $attributs['verifiee_le'] = now();
        }

        return $attributs;
    }

    /**
     * Zone et ville : la zone donnée, sinon celle qui contient la position, sinon la ville donnée sans zone.
     *
     * @param  array<string, mixed>  $donnees
     * @return array{ville_id: int, zone_id: int|null}
     */
    public function localiser(array $donnees, ?Pharmacie $existante): array
    {
        $ville = isset($donnees['ville']) ? Ville::query()->where('id_public', $donnees['ville'])->first() : null;

        if (! empty($donnees['zone'])) {
            $zone = Zone::query()->where('id_public', $donnees['zone'])->firstOrFail();
            if ($ville !== null && $zone->ville_id !== $ville->id) {
                throw new DonneesInvalides('', ['zone' => ['Cette zone n\'appartient pas à la ville choisie.']]);
            }

            return ['ville_id' => $zone->ville_id, 'zone_id' => $zone->id];
        }

        $detectee = $this->zones->chercher((float) $donnees['latitude'], (float) $donnees['longitude']);
        if ($detectee !== null && ($ville === null || $detectee->ville->id === $ville->id)) {
            return ['ville_id' => $detectee->ville->id, 'zone_id' => $detectee->commune->id];
        }

        $villeId = $ville?->id ?? $existante?->ville_id;
        if ($villeId === null) {
            throw new DonneesInvalides('', ['ville' => ['Précisez la ville : la position n\'est dans aucune commune connue.']]);
        }

        return ['ville_id' => $villeId, 'zone_id' => null];
    }
}
