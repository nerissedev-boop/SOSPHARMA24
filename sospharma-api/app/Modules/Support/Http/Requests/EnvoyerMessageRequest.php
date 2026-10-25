<?php

declare(strict_types=1);

namespace App\Modules\Support\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Support\Enums\SujetMessage;
use Illuminate\Validation\Rule;

class EnvoyerMessageRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'sujet' => ['required', Rule::enum(SujetMessage::class)],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'contact' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'sujet.required' => 'Choisissez un sujet.',
            'message.required' => 'Écrivez votre message.',
            'message.min' => 'Votre message est trop court (10 caractères au moins).',
        ];
    }
}
