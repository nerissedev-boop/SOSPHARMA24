<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class NotificationTestRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'appareil' => ['required', 'string', 'exists:appareils,id_public'],
            'titre' => ['sometimes', 'string', 'max:100'],
            'message' => ['sometimes', 'string', 'max:200'],
        ];
    }
}
