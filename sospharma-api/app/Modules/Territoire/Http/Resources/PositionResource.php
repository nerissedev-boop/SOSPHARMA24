<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Resources;

use App\Modules\Territoire\Services\ResultatZone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property ResultatZone $resource */
class PositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return [
            'commune' => ['id' => $r->commune->id_public, 'nom' => $r->commune->nom],
            'quartier' => $r->quartier !== null ? ['id' => $r->quartier->id_public, 'nom' => $r->quartier->nom] : null,
            'ville' => ['id' => $r->ville->id_public, 'nom' => $r->ville->nom],
            'pays' => ['code' => $r->ville->pays->code, 'nom' => $r->ville->pays->nom],
            'libelle' => "{$r->commune->nom}, {$r->ville->nom}",
        ];
    }
}
