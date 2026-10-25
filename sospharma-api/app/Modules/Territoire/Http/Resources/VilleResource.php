<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Resources;

use App\Modules\Territoire\Models\Ville;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Ville */
class VilleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'nom' => $this->nom,
            'statut' => $this->statut->value,
            'pays' => $this->relationLoaded('pays') ? $this->pays->code : null,
            'centre' => ['lat' => (float) $this->latitude, 'lng' => (float) $this->longitude],
            // « Toutes les communes d'Abidjan (13) » : présent quand la requête l'a compté (liste publique).
            'nombre_communes' => $this->when(isset($this->nombre_communes), fn (): int => (int) $this->nombre_communes),
            'actif' => $this->actif,
        ];
    }
}
