<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class ImporterTourRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'ville' => ['required', 'string', 'exists:villes,id_public'],
            'secteur' => ['sometimes', 'nullable', 'string'],
            'debut' => ['required', 'date'],
            'fin' => ['required', 'date', 'after:debut'],
            'fichier' => ['required', 'file', 'max:2048', 'mimetypes:text/csv,text/plain,application/csv,application/vnd.ms-excel'],
        ];
    }
}
