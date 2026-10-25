<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** Création (POST) ou modification (PATCH) d'un brouillon. Dates ISO 8601 (UTC si sans fuseau). */
class EnregistrerTourRequest extends RequeteApi
{
    public function rules(): array
    {
        $creation = $this->isMethod('post');

        return [
            'ville' => [$creation ? 'required' : 'prohibited', 'string', 'exists:villes,id_public'],
            'secteur' => ['sometimes', 'nullable', 'string'],
            'debut' => [$creation ? 'required' : 'sometimes', 'date'],
            'fin' => [$creation ? 'required' : 'sometimes', 'date', ...($creation ? ['after:debut'] : [])],
        ];
    }
}
