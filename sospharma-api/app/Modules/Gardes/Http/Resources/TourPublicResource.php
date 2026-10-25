<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Pharmacies\Http\Resources\PharmacieListeResource;
use App\Modules\Pharmacies\Services\PharmacieTrouvee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property array{tour: TourGarde, pharmacies: list<PharmacieTrouvee>} $resource */
class TourPublicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $tour = $this->resource['tour'];
        $confirmations = $tour->gardes->pluck('confirmee_le')->filter();

        return [
            'id' => $tour->id_public,
            'ville' => ['id' => $tour->ville->id_public, 'nom' => $tour->ville->nom],
            'secteur' => $tour->secteur !== null ? ['id' => $tour->secteur->id_public, 'nom' => $tour->secteur->nom] : null,
            'debut' => Dates::iso($tour->debut),
            'fin' => Dates::iso($tour->fin),
            'publie_le' => Dates::iso($tour->valide_le),
            // Dernière confirmation reçue d'une pharmacie du tour (« Garde confirmée le … »).
            'derniere_confirmation_le' => Dates::iso($confirmations->max()),
            'nombre_confirmees' => $tour->gardes->filter(fn (Garde $g): bool => $g->confirmee_le !== null)->unique('pharmacie_id')->count(),
            'pharmacies' => array_map(fn (PharmacieTrouvee $t): array => (new PharmacieListeResource($t))->resolve($request), $this->resource['pharmacies']),
        ];
    }
}
