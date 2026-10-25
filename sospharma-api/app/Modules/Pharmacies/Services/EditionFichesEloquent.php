<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Geo\Rectangle;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Pharmacies\Contrats\FichePharmacie;
use App\Modules\Pharmacies\Enums\SourceProposition;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Horaire;
use App\Modules\Pharmacies\Models\Pharmacie;
use Carbon\CarbonImmutable;

/** Implémentation Eloquent du contrat EditionFichesPharmacies (liée par PharmaciesServiceProvider). */
final class EditionFichesEloquent implements EditionFichesPharmacies
{
    private const CHAMPS_FICHE = ['nom', 'adresse', 'quartier', 'telephone', 'whatsapp', 'h24', 'services'];

    public function __construct(
        private readonly GestionPharmacies $gestion,
        private readonly AssurancesPharmacie $assurances,
    ) {}

    public function dansRectangle(Rectangle $rectangle, bool $activesSeulement = true, int $max = 200): array
    {
        return Pharmacie::query()
            ->when($activesSeulement, fn ($r) => $r->actives())
            ->whereBetween('latitude', [$rectangle->minLat, $rectangle->maxLat])
            ->whereBetween('longitude', [$rectangle->minLng, $rectangle->maxLng])
            ->with(['zone:id,id_public,nom', 'ville:id,id_public,nom', 'horaires', 'assurancesActives'])
            ->orderBy('id')
            ->limit($max)
            ->get()
            ->map(fn (Pharmacie $p): FichePharmacie => self::fiche($p))
            ->all();
    }

    public function parIdPublic(string $idPublic): ?FichePharmacie
    {
        $pharmacie = Pharmacie::query()->where('id_public', $idPublic)->with(['zone', 'horaires', 'assurancesActives'])->first();

        return $pharmacie !== null ? self::fiche($pharmacie) : null;
    }

    public function parId(int $id): ?FichePharmacie
    {
        $pharmacie = Pharmacie::query()->with(['zone', 'horaires', 'assurancesActives'])->find($id);

        return $pharmacie !== null ? self::fiche($pharmacie) : null;
    }

    public function creer(array $champs, float $lat, float $lng, int $villeId): FichePharmacie
    {
        foreach (['nom', 'adresse'] as $obligatoire) {
            if (! isset($champs[$obligatoire]) || trim((string) $champs[$obligatoire]) === '') {
                throw new DonneesInvalides('', ["champs.{$obligatoire}" => ['Ce champ est obligatoire pour créer une pharmacie.']]);
            }
        }

        $pharmacie = Pharmacie::query()->create(
            array_intersect_key($champs, array_flip(self::CHAMPS_FICHE))
            + $this->gestion->localiserDansVille($lat, $lng, $villeId)
            + ['latitude' => round($lat, 6), 'longitude' => round($lng, 6), 'verifiee_le' => now(), 'actif' => true]
        );
        $this->ecrireLiens($pharmacie, $champs);

        return self::fiche($pharmacie->refresh()->load(['zone', 'horaires', 'assurancesActives']));
    }

    public function mettreAJour(int $pharmacieId, array $champs, ?float $lat = null, ?float $lng = null): FichePharmacie
    {
        /** @var Pharmacie $pharmacie */
        $pharmacie = Pharmacie::query()->lockForUpdate()->findOrFail($pharmacieId);

        $attributs = array_intersect_key($champs, array_flip(self::CHAMPS_FICHE)) + ['verifiee_le' => now()];
        if ($lat !== null && $lng !== null) {
            $attributs += ['latitude' => round($lat, 6), 'longitude' => round($lng, 6)]
                + $this->gestion->localiserDansVille($lat, $lng, $pharmacie->ville_id);
        }
        $pharmacie->update($attributs);
        $this->ecrireLiens($pharmacie, $champs);

        return self::fiche($pharmacie->refresh()->load(['zone', 'horaires', 'assurancesActives']));
    }

    public function definirPhotoFacade(int $pharmacieId, string $cheminPublic): ?string
    {
        /** @var Pharmacie $pharmacie */
        $pharmacie = Pharmacie::query()->findOrFail($pharmacieId);
        $ancienne = $pharmacie->photo_facade;
        $pharmacie->update(['photo_facade' => $cheminPublic]);

        return $ancienne !== $cheminPublic ? $ancienne : null;
    }

    public function assurancesInconnues(int $villeId, array $idsPublics): array
    {
        return $this->assurances->inconnues($villeId, $idsPublics);
    }

    public function proposerAssurances(int $villeId, ?int $pharmacieId, array $noms, ?int $auteurId, ?int $releveId): int
    {
        return count($this->assurances->proposer($villeId, $pharmacieId, $noms, SourceProposition::Releve, $auteurId, $releveId));
    }

    /** Horaires et assurances : remplacés en entier quand ils sont fournis. */
    private function ecrireLiens(Pharmacie $pharmacie, array $champs): void
    {
        if (array_key_exists('horaires', $champs) && is_array($champs['horaires'])) {
            $pharmacie->horaires()->delete();
            foreach ($champs['horaires'] as $plage) {
                $pharmacie->horaires()->create([
                    'jour' => (int) $plage['jour'],
                    'ouverture' => (string) $plage['ouverture'],
                    'fermeture' => (string) $plage['fermeture'],
                ]);
            }
        }

        if (array_key_exists('assurances', $champs) && is_array($champs['assurances'])) {
            $pharmacie->assurances()->sync($this->assurances->liens($pharmacie->ville_id, array_values($champs['assurances']), 'champs.assurances'));
        }
    }

    private static function fiche(Pharmacie $p): FichePharmacie
    {
        return new FichePharmacie(
            id: $p->id,
            idPublic: $p->id_public,
            villeId: $p->ville_id,
            zoneId: $p->zone_id,
            zoneNom: $p->zone?->nom,
            nom: $p->nom,
            adresse: $p->adresse,
            quartier: $p->quartier,
            telephone: $p->telephone,
            whatsapp: $p->whatsapp,
            latitude: $p->lat(),
            longitude: $p->lng(),
            h24: $p->h24,
            services: array_values($p->services ?? []),
            horaires: $p->horaires->map(fn (Horaire $h): array => $h->enPlage())->values()->all(),
            assurances: $p->assurancesActives->map(fn (Assurance $a): array => [
                'id' => $a->id_public, 'nom' => $a->nom, 'tiers_payant' => (bool) $a->pivot?->tiers_payant,
            ])->values()->all(),
            photoFacadeUrl: $p->urlPhotoFacade(),
            verifieeLe: $p->verifiee_le !== null ? CarbonImmutable::instance($p->verifiee_le) : null,
            actif: $p->actif,
        );
    }
}
