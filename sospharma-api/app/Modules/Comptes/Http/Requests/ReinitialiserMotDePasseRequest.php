<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use Illuminate\Validation\Rules\Password;

class ReinitialiserMotDePasseRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'confirmed', Password::min(10)->letters()->numbers()],
        ];
    }
}
