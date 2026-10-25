<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Resources;

use App\Modules\Territoire\Models\Zone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property array{zone: Zone, pharmacies: int, gardes: int} $resource */
class CompteurCommuneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $zone = $this->resource['zone'];

        return [
            'zone' => ['id' => $zone->id_public, 'nom' => $zone->nom, 'type' => $zone->type->value],
            'centre' => ['lat' => (float) $zone->centre_lat, 'lng' => (float) $zone->centre_lng],
            'pharmacies' => $this->resource['pharmacies'],
            'gardes' => $this->resource['gardes'],
        ];
    }
}
