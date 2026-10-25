<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Commun\Geo\Distance;
use App\Commun\Support\Dates;
use App\Modules\Gardes\Exceptions\TourGardeIntrouvable;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Pharmacies\Contrats\PeriodeGarde;
use App\Modules\Pharmacies\Enums\StatutOuverture;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\PharmacieTrouvee;
use App\Modules\Pharmacies\Services\ResultatStatut;
use App\Modules\Pharmacies\Services\StatutsPharmacies;
use Illuminate\Database\Eloquent\Collection;

/** Tour publié en cours d'une ville, avec ses pharmacies (statut et, si position fournie, distance). */
final class TourEnCours
{
    public function __construct(private readonly StatutsPharmacies $statuts) {}

    /** @return array{tour: TourGarde, pharmacies: list<PharmacieTrouvee>} */
    public function pour(int $villeId, ?float $lat = null, ?float $lng = null): array
    {
        $maintenant = Dates::maintenant();
        $instant = $maintenant->format('Y-m-d H:i:s');

        $tour = TourGarde::query()->publies()
            ->where('ville_id', $villeId)
            ->where('debut', '<=', $instant)
            ->where('fin', '>', $instant)
            ->orderByDesc('valide_le')
            ->with(['ville', 'secteur', 'gardes.pharmacie.zone', 'gardes.pharmacie.ville:id,id_public,nom', 'gardes.pharmacie.horaires', 'gardes.pharmacie.assurancesActives'])
            ->first() ?? throw new TourGardeIntrouvable('Aucun tour de garde en cours dans cette ville.');

        $pharmacies = new Collection($tour->gardes->map(fn (Garde $g): Pharmacie => $g->pharmacie)->filter(fn (Pharmacie $p): bool => $p->actif)->unique('id')->values()->all());
        $statuts = $this->statuts->pour($pharmacies, $maintenant);

        $lignes = [];
        foreach ($pharmacies as $pharmacie) {
            $statut = $statuts[$pharmacie->id];
            if ($statut->garde === null) {
                // La pharmacie fait partie du tour mais pas maintenant (garde « jusqu'à 02:00 » terminée) :
                // on affiche quand même sa prochaine garde du tour.
                $prochaine = $tour->gardes->first(fn (Garde $g): bool => $g->pharmacie_id === $pharmacie->id && $g->fin->greaterThan($maintenant));
                if ($prochaine !== null) {
                    $statut = new ResultatStatut($statut->statut, $statut->prochaineOuverture, new PeriodeGarde(
                        $pharmacie->id, $prochaine->debut, $prochaine->fin, $prochaine->confirmee_le, $tour->id_public,
                    ));
                }
            }
            $distance = $lat !== null && $lng !== null ? Distance::metres($lat, $lng, $pharmacie->lat(), $pharmacie->lng()) : null;
            $lignes[] = new PharmacieTrouvee($pharmacie, $statut, $distance);
        }

        usort($lignes, function (PharmacieTrouvee $a, PharmacieTrouvee $b): int {
            $gardeA = $a->statut->statut === StatutOuverture::Garde ? 0 : 1;
            $gardeB = $b->statut->statut === StatutOuverture::Garde ? 0 : 1;

            return [$gardeA, $a->distanceM ?? 0, $a->pharmacie->nom] <=> [$gardeB, $b->distanceM ?? 0, $b->pharmacie->nom];
        });

        return ['tour' => $tour, 'pharmacies' => $lignes];
    }
}
