<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class RattacherPharmacieRequest extends RequeteApi
{
    public function rules(): array
    {
        return ['pharmacie' => ['required', 'string', 'exists:pharmacies,id_public']];
    }
}
