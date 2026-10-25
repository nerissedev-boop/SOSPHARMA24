<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Resources;

use App\Modules\Pharmacies\Models\Assurance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Assurance du référentiel, pour les filtres, le profil et les relevés de l'app. @mixin Assurance */
class AssuranceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'nom' => $this->nom,
            'slug' => $this->slug,
            'type' => $this->type->value,
            'type_libelle' => $this->type->libelle(),
            'logo' => $this->urlLogo(),
        ];
    }
}
