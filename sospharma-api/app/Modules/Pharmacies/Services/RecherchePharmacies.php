<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Geo\Distance;
use App\Commun\Geo\Rectangle;
use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Models\Pharmacie;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Recherches publiques : par distance (rectangle indexé puis haversine), par cadre de carte, par nom.
 * Volume visé : quelques milliers de pharmacies par pays, sans extension géographique.
 */
final class RecherchePharmacies
{
    public const RAYON_MAX_M = 5000;

    public const LIMITE_DEFAUT = 20;

    public const LIMITE_MAX = 50;

    public const PLAFOND_CARTE = 300;

    public function __construct(private readonly StatutsPharmacies $statuts) {}

    /** @return list<PharmacieTrouvee> triées par distance croissante */
    public function proches(float $lat, float $lng, int $rayonM, int $limite, FiltresPharmacies $filtres): array
    {
        $rectangle = Distance::rectangle($lat, $lng, $rayonM);
        $pharmacies = $this->dansRectangle($this->requeteFiltree($filtres), $rectangle)->get();

        $trouvees = $this->avecStatut($pharmacies, $filtres, $lat, $lng);
        $trouvees = array_values(array_filter($trouvees, fn (PharmacieTrouvee $t): bool => $t->distanceM <= $rayonM));
        usort($trouvees, fn (PharmacieTrouvee $a, PharmacieTrouvee $b): int => $a->distanceM <=> $b->distanceM);

        return array_slice($trouvees, 0, $limite);
    }

    /** @return array{pharmacies: list<PharmacieTrouvee>, tronque: bool} */
    public function cadre(Rectangle $cadre, FiltresPharmacies $filtres): array
    {
        // Avec un filtre de statut (calculé en PHP), on lit plus large avant de plafonner.
        $lecture = $filtres->statut !== null ? self::PLAFOND_CARTE * 10 : self::PLAFOND_CARTE + 1;
        $pharmacies = $this->dansRectangle($this->requeteFiltree($filtres), $cadre)->orderBy('id')->limit($lecture)->get();

        $trouvees = $this->avecStatut($pharmacies, $filtres);

        return [
            'pharmacies' => array_slice($trouvees, 0, self::PLAFOND_CARTE),
            'tronque' => count($trouvees) > self::PLAFOND_CARTE,
        ];
    }

    /** @return list<PharmacieTrouvee> */
    public function rechercher(string $q, ?int $villeId, ?float $lat, ?float $lng, int $limite): array
    {
        $motif = '%'.addcslashes($q, '%_\\').'%';
        $pharmacies = $this->requeteFiltree(new FiltresPharmacies)
            ->when($villeId !== null, fn (Builder $r) => $r->where('ville_id', $villeId))
            ->where(fn (Builder $r) => $r->where('nom', 'like', $motif)
                ->orWhere('quartier', 'like', $motif)
                ->orWhereHas('zone', fn (Builder $z) => $z->where('nom', 'like', $motif)))
            ->orderBy('nom')
            ->limit($lat !== null ? 500 : $limite)
            ->get();

        $trouvees = $this->avecStatut($pharmacies, new FiltresPharmacies, $lat, $lng);
        if ($lat !== null) {
            usort($trouvees, fn (PharmacieTrouvee $a, PharmacieTrouvee $b): int => $a->distanceM <=> $b->distanceM);
        }

        return array_slice($trouvees, 0, $limite);
    }

    /** @return Builder<Pharmacie> */
    private function requeteFiltree(FiltresPharmacies $filtres): Builder
    {
        return Pharmacie::query()
            ->actives()
            ->with(['zone:id,id_public,nom', 'ville:id,id_public,nom', 'horaires', 'assurancesActives'])
            ->when($filtres->h24 !== null, fn (Builder $r) => $r->where('h24', $filtres->h24))
            ->when($filtres->assurances !== null, fn (Builder $r) => FiltresPharmacies::appliquerAssurances($r, (array) $filtres->assurances));
    }

    /**
     * @param  Builder<Pharmacie>  $requete
     * @return Builder<Pharmacie>
     */
    private function dansRectangle(Builder $requete, Rectangle $r): Builder
    {
        return $requete
            ->whereBetween('latitude', [$r->minLat, $r->maxLat])
            ->whereBetween('longitude', [$r->minLng, $r->maxLng]);
    }

    /**
     * @param  Collection<int, Pharmacie>  $pharmacies
     * @return list<PharmacieTrouvee>
     */
    private function avecStatut(Collection $pharmacies, FiltresPharmacies $filtres, ?float $lat = null, ?float $lng = null): array
    {
        $statuts = $this->statuts->pour($pharmacies, Dates::maintenant());
        $trouvees = [];
        foreach ($pharmacies as $pharmacie) {
            $statut = $statuts[$pharmacie->id];
            if ($filtres->statut !== null && $statut->statut !== $filtres->statut) {
                continue;
            }
            $distance = $lat !== null && $lng !== null && $pharmacie->aUnePosition() ? Distance::metres($lat, $lng, (float) $pharmacie->lat(), (float) $pharmacie->lng()) : null;
            $trouvees[] = new PharmacieTrouvee($pharmacie, $statut, $distance);
        }

        return $trouvees;
    }
}
