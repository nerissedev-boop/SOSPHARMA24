<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Contrats\SourcePeriodesGarde;
use App\Modules\Pharmacies\Models\Horaire;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Services\ConfigurationPays;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/** Calcule le statut d'un lot de pharmacies en un minimum de requêtes. */
final class StatutsPharmacies
{
    public function __construct(
        private readonly StatutPharmacie $regle,
        private readonly SourcePeriodesGarde $gardes,
        private readonly ConfigurationPays $configuration,
    ) {}

    /**
     * @param  Collection<int, Pharmacie>  $pharmacies
     * @return array<int, ResultatStatut> indexé par id interne
     */
    public function pour(Collection $pharmacies, ?CarbonImmutable $instant = null): array
    {
        if ($pharmacies->isEmpty()) {
            return [];
        }

        $instant ??= Dates::maintenant();
        $pharmacies->loadMissing('horaires');
        $gardes = $this->gardes->gardesEnCours($pharmacies->pluck('id')->all(), $instant);

        $resultats = [];
        foreach ($pharmacies as $pharmacie) {
            $resultats[$pharmacie->id] = $this->regle->calculer(
                $pharmacie->h24,
                $pharmacie->horaires->map(fn (Horaire $h): array => $h->enPlage()),
                isset($gardes[$pharmacie->id]) ? [$gardes[$pharmacie->id]] : [],
                $this->configuration->fuseauDeVille($pharmacie->ville_id),
                $instant,
            );
        }

        return $resultats;
    }

    public function pourUne(Pharmacie $pharmacie, ?CarbonImmutable $instant = null): ResultatStatut
    {
        return $this->pour(new Collection([$pharmacie]), $instant)[$pharmacie->id];
    }
}
