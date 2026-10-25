<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** Ce qu'un pharmacien peut modifier sur sa fiche. */
class FichePharmacienRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'telephone' => ['sometimes', 'nullable', 'string', EnregistrerPharmacieRequest::TELEPHONE],
            'whatsapp' => ['sometimes', 'nullable', 'string', EnregistrerPharmacieRequest::TELEPHONE],
            'services' => ['sometimes', 'nullable', 'array', 'max:30'],
            'services.*' => ['string', 'max:80'],
            // Les assurances ont leur route : PUT …/assurances (table pharmacie_assurances).
            'assurances' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return ['assurances.prohibited' => 'Les assurances se modifient par la route dédiée PUT /pharmacien/pharmacie/assurances.'];
    }
}
