<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Gardes\Models\TourGarde;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TourGarde */
class TourGardeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $compte = fn (string $relation): ?array => $this->relationLoaded($relation) && $this->{$relation} !== null
            ? ['id' => $this->{$relation}->id_public, 'nom' => $this->{$relation}->nom]
            : null;

        return [
            'id' => $this->id_public,
            'ville' => $this->relationLoaded('ville') ? ['id' => $this->ville->id_public, 'nom' => $this->ville->nom] : null,
            'secteur' => $this->relationLoaded('secteur') && $this->secteur !== null ? ['id' => $this->secteur->id_public, 'nom' => $this->secteur->nom] : null,
            'debut' => Dates::iso($this->debut),
            'fin' => Dates::iso($this->fin),
            'statut' => $this->statut->value,
            'saisi_par' => $compte('saisiPar'),
            'valide_par' => $compte('validePar'),
            'valide_le' => Dates::iso($this->valide_le),
            'nombre_gardes' => $this->relationLoaded('gardes') ? $this->gardes->count() : ($this->gardes_count ?? null),
            'gardes' => $this->relationLoaded('gardes') ? GardeResource::collection($this->gardes)->resolve($request) : null,
            'cree_le' => Dates::iso($this->created_at),
        ];
    }
}
