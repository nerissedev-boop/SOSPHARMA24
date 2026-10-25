<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use Illuminate\Validation\Rule;

class ImporterZonesRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'ville' => ['required', 'string', Rule::exists('villes', 'id_public')],
            'fichier' => ['required', 'file', 'max:5120', 'mimetypes:application/json,application/geo+json,text/plain'],
            'contour_source' => ['sometimes', 'nullable', 'string', 'max:150'],
        ];
    }
}
