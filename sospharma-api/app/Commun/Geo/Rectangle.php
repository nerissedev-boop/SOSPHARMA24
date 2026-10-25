<?php

declare(strict_types=1);

namespace App\Commun\Geo;

use InvalidArgumentException;

/** Rectangle englobant (bbox) en degrés décimaux. */
final class Rectangle
{
    public function __construct(
        public readonly float $minLat,
        public readonly float $maxLat,
        public readonly float $minLng,
        public readonly float $maxLng,
    ) {
        if ($minLat > $maxLat || $minLng > $maxLng) {
            throw new InvalidArgumentException('Rectangle englobant invalide.');
        }
    }

    public function contient(float $lat, float $lng): bool
    {
        return $lat >= $this->minLat && $lat <= $this->maxLat && $lng >= $this->minLng && $lng <= $this->maxLng;
    }

    /** @return array{lat: float, lng: float} */
    public function centre(): array
    {
        return [
            'lat' => round(($this->minLat + $this->maxLat) / 2, 6),
            'lng' => round(($this->minLng + $this->maxLng) / 2, 6),
        ];
    }
}
