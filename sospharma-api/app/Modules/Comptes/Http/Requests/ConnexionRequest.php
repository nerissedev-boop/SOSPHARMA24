<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class ConnexionRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'nom_appareil' => ['sometimes', 'string', 'max:100'],
        ];
    }
}
