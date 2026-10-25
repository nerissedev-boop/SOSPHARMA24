<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class RechercheZonesRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'q' => ['sometimes', 'string', 'min:2', 'max:100'],
        ];
    }
}
