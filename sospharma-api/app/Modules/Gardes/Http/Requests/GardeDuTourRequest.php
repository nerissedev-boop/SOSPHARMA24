<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** Ajouter (POST) ou retirer (DELETE) une pharmacie d'un brouillon. */
class GardeDuTourRequest extends RequeteApi
{
    public function rules(): array
    {
        $ajout = $this->isMethod('post');

        return [
            'pharmacie' => ['required', 'string', 'exists:pharmacies,id_public'],
            'debut' => [$ajout ? 'sometimes' : 'prohibited', 'nullable', 'date'],
            'fin' => [$ajout ? 'sometimes' : 'prohibited', 'nullable', 'date'],
        ];
    }
}
