<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Gardes\Models\Garde;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Garde */
class GardeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $pharmacie = $this->relationLoaded('pharmacie') ? $this->pharmacie : null;
        $tour = $this->relationLoaded('tour') ? $this->tour : null;

        return [
            'id' => $this->id_public,
            'tour' => $tour?->id_public,
            'statut_tour' => $tour?->statut->value,
            'pharmacie' => $pharmacie !== null ? [
                'id' => $pharmacie->id_public,
                'nom' => $pharmacie->nom,
                'zone' => $pharmacie->relationLoaded('zone') && $pharmacie->zone !== null ? $pharmacie->zone->nom : null,
            ] : null,
            'debut' => Dates::iso($this->debut),
            'fin' => Dates::iso($this->fin),
            'confirmee_le' => Dates::iso($this->confirmee_le),
        ];
    }
}
