<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Resources;

use App\Modules\Territoire\Models\Zone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Zone */
class ZoneResource extends JsonResource
{
    /** @var array{pharmacies: int, gardes: int}|null */
    private ?array $compteurs = null;

    /** @param array{pharmacies: int, gardes: int}|null $compteurs */
    public function avecCompteurs(?array $compteurs): static
    {
        $this->compteurs = $compteurs;

        return $this;
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'nom' => $this->nom,
            'type' => $this->type->value,
            'ville' => $this->relationLoaded('ville') ? $this->ville->id_public : null,
            'centre' => ['lat' => (float) $this->centre_lat, 'lng' => (float) $this->centre_lng],
            'compteurs' => $this->compteurs,
        ];
    }
}
