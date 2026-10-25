<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Commun\Validation\GeoJsonValide;
use App\Modules\Territoire\Enums\TypeZone;
use Illuminate\Validation\Rule;

class EnregistrerZoneRequest extends RequeteApi
{
    public function rules(): array
    {
        $creation = $this->isMethod('post');
        $requis = $creation ? 'required' : 'sometimes';

        return [
            'ville' => [$creation ? 'required' : 'prohibited', 'string', Rule::exists('villes', 'id_public')],
            'nom' => [$requis, 'string', 'max:100'],
            'type' => [$requis, Rule::enum(TypeZone::class)],
            'contour' => [$requis, new GeoJsonValide],
            'contour_source' => ['sometimes', 'nullable', 'string', 'max:150'],
            'actif' => ['sometimes', 'boolean'],
        ];
    }
}
