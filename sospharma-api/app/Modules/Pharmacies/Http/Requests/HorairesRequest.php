<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** Remplace toutes les plages d'un coup. Fermeture avant l'ouverture : la plage passe minuit. */
class HorairesRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'h24' => ['sometimes', 'boolean'],
            'horaires' => ['present', 'array', 'max:28'],
            'horaires.*.jour' => ['required', 'integer', 'between:0,6'],
            'horaires.*.ouverture' => ['required', 'date_format:H:i'],
            'horaires.*.fermeture' => ['required', 'date_format:H:i', 'different:horaires.*.ouverture'],
        ];
    }
}
