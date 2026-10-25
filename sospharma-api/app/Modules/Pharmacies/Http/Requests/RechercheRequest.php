<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Pharmacies\Services\RecherchePharmacies;

class RechercheRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'ville' => ['sometimes', 'string', 'exists:villes,id_public'],
            'lat' => ['sometimes', 'required_with:lng', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'required_with:lat', 'numeric', 'between:-180,180'],
            'limite' => ['sometimes', 'integer', 'min:1', 'max:'.RecherchePharmacies::LIMITE_MAX],
        ];
    }
}
