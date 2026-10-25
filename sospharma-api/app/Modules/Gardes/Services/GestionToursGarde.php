<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\CompteAvecRole;
use App\Commun\Support\Dates;
use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Exceptions\GardeIntrouvable;
use App\Modules\Gardes\Exceptions\TourGardeNonModifiable;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\SecteurGarde;
use App\Modules\Territoire\Models\Ville;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/** Brouillons de tours de garde : création, modification, suppression, ajout et retrait de pharmacies. */
final class GestionToursGarde
{
    /** @param array{ville: string, secteur?: string|null, debut: string, fin: string} $donnees */
    public function creer(array $donnees, CompteAvecRole $auteur): TourGarde
    {
        $ville = Ville::query()->where('id_public', $donnees['ville'])->firstOrFail();

        return TourGarde::query()->create([
            'ville_id' => $ville->id,
            'secteur_garde_id' => $this->secteur($donnees['secteur'] ?? null, $ville->id),
            'debut' => Dates::depuisIso($donnees['debut']),
            'fin' => Dates::depuisIso($donnees['fin']),
            'statut' => StatutTour::Brouillon,
            'saisi_par' => $auteur->idInterne(),
        ]);
    }

    /** @param array{secteur?: string|null, debut?: string, fin?: string} $donnees */
    public function modifier(TourGarde $tour, array $donnees): TourGarde
    {
        $this->exigerBrouillon($tour);
        $debut = isset($donnees['debut']) ? Dates::depuisIso($donnees['debut']) : $tour->debut;
        $fin = isset($donnees['fin']) ? Dates::depuisIso($donnees['fin']) : $tour->fin;
        if (! $debut->lessThan($fin)) {
            throw new DonneesInvalides('', ['fin' => ['La fin doit être après le début.']]);
        }

        $attributs = ['debut' => $debut, 'fin' => $fin];
        if (array_key_exists('secteur', $donnees)) {
            $attributs['secteur_garde_id'] = $this->secteur($donnees['secteur'], $tour->ville_id);
        }
        $tour->update($attributs);

        return $tour;
    }

    /** Un brouillon jamais publié se supprime vraiment ; un tour publié ne se supprime pas. */
    public function supprimer(TourGarde $tour): void
    {
        $this->exigerBrouillon($tour);
        DB::transaction(function () use ($tour): void {
            $tour->gardes()->delete();
            $tour->delete();
        });
    }

    public function ajouterGarde(TourGarde $tour, string $pharmacieIdPublic, ?string $debut, ?string $fin): Garde
    {
        $this->exigerBrouillon($tour);
        $pharmacie = Pharmacie::query()->where('id_public', $pharmacieIdPublic)->firstOrFail();
        if ($pharmacie->ville_id !== $tour->ville_id) {
            throw new DonneesInvalides('', ['pharmacie' => ['Cette pharmacie n\'est pas dans la ville du tour.']]);
        }
        $periodeDebut = $debut !== null ? Dates::depuisIso($debut) : $tour->debut;
        $periodeFin = $fin !== null ? Dates::depuisIso($fin) : $tour->fin;
        $this->verifierPeriode($tour, $periodeDebut, $periodeFin);

        return Garde::query()->updateOrCreate(
            ['tour_garde_id' => $tour->id, 'pharmacie_id' => $pharmacie->id, 'debut' => $periodeDebut],
            ['fin' => $periodeFin],
        );
    }

    public function retirerGarde(TourGarde $tour, string $pharmacieIdPublic): void
    {
        $this->exigerBrouillon($tour);
        $supprimees = Garde::query()
            ->where('tour_garde_id', $tour->id)
            ->whereHas('pharmacie', fn ($r) => $r->where('id_public', $pharmacieIdPublic))
            ->delete();
        if ($supprimees === 0) {
            throw new GardeIntrouvable('Cette pharmacie ne fait pas partie du tour.');
        }
    }

    public function verifierPeriode(TourGarde $tour, CarbonImmutable $debut, CarbonImmutable $fin): void
    {
        if (! $debut->lessThan($fin)) {
            throw new DonneesInvalides('', ['fin' => ['La fin de la garde doit être après son début.']]);
        }
        if ($debut->lessThan($tour->debut) || $fin->greaterThan($tour->fin)) {
            throw new DonneesInvalides('', ['debut' => ['La garde doit rester dans la période du tour.']]);
        }
    }

    public function exigerBrouillon(TourGarde $tour): void
    {
        if (! $tour->estBrouillon()) {
            throw new TourGardeNonModifiable;
        }
    }

    private function secteur(?string $idPublic, int $villeId): ?int
    {
        if ($idPublic === null) {
            return null;
        }
        $secteur = SecteurGarde::query()->where('id_public', $idPublic)->where('ville_id', $villeId)->first();

        return $secteur?->id ?? throw new DonneesInvalides('', ['secteur' => ['Secteur inconnu dans cette ville.']]);
    }
}
