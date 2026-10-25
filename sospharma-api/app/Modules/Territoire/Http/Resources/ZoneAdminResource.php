<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Zone */
class ZoneAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'nom' => $this->nom,
            'type' => $this->type->value,
            'ville' => $this->relationLoaded('ville') ? $this->ville->id_public : null,
            'contour' => $this->contour,
            'contour_source' => $this->contour_source,
            'bbox' => [
                'min_lat' => (float) $this->bbox_min_lat,
                'max_lat' => (float) $this->bbox_max_lat,
                'min_lng' => (float) $this->bbox_min_lng,
                'max_lng' => (float) $this->bbox_max_lng,
            ],
            'centre' => ['lat' => (float) $this->centre_lat, 'lng' => (float) $this->centre_lng],
            'actif' => $this->actif,
            'cree_le' => Dates::iso($this->created_at),
            'modifie_le' => Dates::iso($this->updated_at),
        ];
    }
}
