<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class CadreRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            // minLng,minLat,maxLng,maxLat (ordre GeoJSON / MapLibre)
            'bbox' => ['required', 'string', 'regex:/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/'],
        ];
    }

    public function messages(): array
    {
        return ['bbox.regex' => 'bbox attend 4 nombres : minLng,minLat,maxLng,maxLat.'];
    }
}
