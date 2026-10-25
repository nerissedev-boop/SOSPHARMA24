<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Models\Assurance;
use Illuminate\Http\Request;

/** @mixin Assurance */
class AssuranceAdminResource extends AssuranceResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'pays' => $this->relationLoaded('pays') ? $this->pays->code : null,
            'pharmacies' => $this->pharmacies_count ?? null,
            'actif' => $this->actif,
            'cree_le' => Dates::iso($this->created_at),
            'modifie_le' => Dates::iso($this->updated_at),
        ];
    }
}
