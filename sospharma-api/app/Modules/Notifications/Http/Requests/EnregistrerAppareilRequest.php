<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** POST /appareils (enregistrement) et PATCH /appareils/moi (préférences). */
class EnregistrerAppareilRequest extends RequeteApi
{
    public function rules(): array
    {
        $creation = $this->isMethod('post');

        return [
            'identifiant_anonyme' => [$creation ? 'required' : 'prohibited', 'string', 'min:16', 'max:100', 'regex:/^[A-Za-z0-9\-]+$/'],
            'jeton_expo' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_\-]+\]$/'],
            'plateforme' => [$creation ? 'sometimes' : 'prohibited', 'nullable', 'in:ios,android'],
            'ville' => ['sometimes', 'nullable', 'string', 'exists:villes,id_public'],
            'zone' => ['sometimes', 'nullable', 'string', 'exists:zones,id_public'],
            'notification_garde' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return ['jeton_expo.regex' => 'Jeton de notification Expo invalide.'];
    }
}
