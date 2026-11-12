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
            'simulation' => ['sometimes', 'boolean'],
            // Lignes du fichier retirées dans l'aperçu (numéros de ligne, en-tête = 1) : ni créées ni modifiées.
            'exclure' => ['sometimes', 'array', 'max:5000'],
            'exclure.*' => ['integer', 'min:2'],
        ];
    }
}
