<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class EnCoursRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'ville' => ['required', 'string', 'exists:villes,id_public'],
            'lat' => ['sometimes', 'required_with:lng', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'required_with:lat', 'numeric', 'between:-180,180'],
        ];
    }
}
