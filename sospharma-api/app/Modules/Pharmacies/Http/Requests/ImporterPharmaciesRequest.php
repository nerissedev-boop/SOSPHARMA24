<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class ImporterPharmaciesRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'ville' => ['required', 'string', 'exists:villes,id_public'],
            'fichier' => ['required', 'file', 'max:5120', 'mimetypes:text/csv,text/plain,application/csv,application/vnd.ms-excel'],
        ];
    }
}
