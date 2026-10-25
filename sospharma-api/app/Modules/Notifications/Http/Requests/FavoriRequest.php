<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class FavoriRequest extends RequeteApi
{
    public function rules(): array
    {
        return ['pharmacie' => ['required', 'string', 'exists:pharmacies,id_public']];
    }
}
