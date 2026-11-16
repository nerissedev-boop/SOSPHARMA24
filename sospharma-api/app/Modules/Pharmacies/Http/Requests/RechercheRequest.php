<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\PositionFacultativeRequest;
use App\Modules\Pharmacies\Services\RecherchePharmacies;

/** Recherche par nom ; lat/lng facultatifs pour trier par distance. */
class RechercheRequest extends PositionFacultativeRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'ville' => ['sometimes', 'string', 'exists:villes,id_public'],
            'limite' => ['sometimes', 'integer', 'min:1', 'max:'.RecherchePharmacies::LIMITE_MAX],
        ];
    }
}
