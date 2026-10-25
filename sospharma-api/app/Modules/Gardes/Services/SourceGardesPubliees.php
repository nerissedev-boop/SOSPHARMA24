<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Modules\Gardes\Models\Garde;
use App\Modules\Pharmacies\Contrats\PeriodeGarde;
use App\Modules\Pharmacies\Contrats\SourcePeriodesGarde;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/** Fournit à la règle de statut les gardes des tours publiés. */
final class SourceGardesPubliees implements SourcePeriodesGarde
{
    public function gardesEnCours(array $pharmacieIds, CarbonImmutable $instant): array
    {
        if ($pharmacieIds === []) {
            return [];
        }

        return $this->indexer($this->requete($instant)->whereIn('gardes.pharmacie_id', $pharmacieIds)->get());
    }

    public function pharmaciesDeGarde(CarbonImmutable $instant, ?int $villeId = null): array
    {
        return $this->indexer($this->requete($instant)
            ->when($villeId !== null, fn (Builder $r) => $r->whereHas('tour', fn (Builder $t) => $t->where('ville_id', $villeId)))
            ->get());
    }

    /** @return Builder<Garde> */
    private function requete(CarbonImmutable $instant): Builder
    {
        $maintenant = $instant->utc()->format('Y-m-d H:i:s');

        return Garde::query()
            ->with('tour:id,id_public')
            ->whereHas('tour', fn (Builder $t) => $t->publies())
            ->where('gardes.debut', '<=', $maintenant)
            ->where('gardes.fin', '>', $maintenant);
    }

    /**
     * @param  iterable<Garde>  $gardes
     * @return array<int, PeriodeGarde>
     */
    private function indexer(iterable $gardes): array
    {
        $resultat = [];
        foreach ($gardes as $garde) {
            $resultat[$garde->pharmacie_id] ??= new PeriodeGarde(
                $garde->pharmacie_id,
                $garde->debut->utc(),
                $garde->fin->utc(),
                $garde->confirmee_le?->utc(),
                $garde->tour->id_public,
            );
        }

        return $resultat;
    }
}
