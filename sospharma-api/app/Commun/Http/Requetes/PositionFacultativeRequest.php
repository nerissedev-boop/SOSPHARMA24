<?php

declare(strict_types=1);

namespace App\Commun\Http\Requetes;

/**
 * Position de l'usager facultative (lat + lng ensemble) : sert seulement à calculer la distance.
 */
class PositionFacultativeRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            // Sans « sometimes » : sinon lng seul passerait (lat absent n'est jamais contrôlé).
            'lat' => ['required_with:lng', 'numeric', 'between:-90,90'],
            'lng' => ['required_with:lat', 'numeric', 'between:-180,180'],
        ];
    }

    public function latitude(): ?float
    {
        $lat = $this->validated('lat');

        return $lat !== null ? (float) $lat : null;
    }

    public function longitude(): ?float
    {
        $lng = $this->validated('lng');

        return $lng !== null ? (float) $lng : null;
    }
}
