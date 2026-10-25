<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Releves\Enums\TypePhoto;
use Illuminate\Validation\Rule;

class PhotoReleveRequest extends RequeteApi
{
    public function rules(): array
    {
        return ['type' => ['required', Rule::enum(TypePhoto::class)]] + self::reglesPhoto();
    }

    /**
     * Règle commune aux photos d'agents et d'usagers.
     *
     * @return array<string, list<string>>
     */
    public static function reglesPhoto(): array
    {
        // Image de 5 Mo au plus (l'app la réduit à 1 600 px avant envoi).
        return ['photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']];
    }
}
