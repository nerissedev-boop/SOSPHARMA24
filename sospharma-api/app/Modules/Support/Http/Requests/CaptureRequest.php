<?php

declare(strict_types=1);

namespace App\Modules\Support\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

class CaptureRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            // Image de 5 Mo au plus.
            'capture' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }
}
