<?php

declare(strict_types=1);

namespace App\Commun\Http\Requetes;

/** Position GPS obligatoire (lat, lng). */
class PositionRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    public function latitude(): float
    {
        return (float) $this->query('lat');
    }

    public function longitude(): float
    {
        return (float) $this->query('lng');
    }
}
