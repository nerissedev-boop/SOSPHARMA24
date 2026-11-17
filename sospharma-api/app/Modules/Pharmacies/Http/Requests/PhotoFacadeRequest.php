<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** Photo de façade envoyée par l'équipe depuis le back-office. */
class PhotoFacadeRequest extends RequeteApi
{
    public function rules(): array
    {
        // Mêmes limites que les photos des relevés : 5 Mo au plus, JPEG, PNG ou WebP.
        return ['photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']];
    }

    public function messages(): array
    {
        return [
            'photo.required' => 'Choisissez une photo de la façade.',
            'photo.image' => 'Image JPEG, PNG ou WebP attendue.',
            'photo.mimes' => 'Image JPEG, PNG ou WebP attendue.',
            'photo.max' => 'La photo dépasse 5 Mo.',
        ];
    }
}
