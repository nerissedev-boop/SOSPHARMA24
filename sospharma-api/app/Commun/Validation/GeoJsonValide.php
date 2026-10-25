<?php

declare(strict_types=1);

namespace App\Commun\Validation;

use App\Commun\Geo\Geometrie;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use InvalidArgumentException;

/** Contour GeoJSON Polygon ou MultiPolygon valide (objet ou chaîne JSON). */
final class GeoJsonValide implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value)) {
            $value = json_decode($value, true);
        }
        if (! is_array($value)) {
            $fail('Le contour doit être un objet GeoJSON.');

            return;
        }
        try {
            Geometrie::normaliser($value);
        } catch (InvalidArgumentException $e) {
            // Erreur traitée : renvoyée à l'utilisateur comme erreur de champ.
            $fail($e->getMessage());
        }
    }
}
