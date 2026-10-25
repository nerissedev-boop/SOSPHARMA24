<?php

declare(strict_types=1);

namespace App\Commun\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use DateTimeInterface;

final class Dates
{
    /** ISO 8601 en UTC avec « Z » : 2026-10-20T23:40:12Z. */
    public static function iso(?DateTimeInterface $date): ?string
    {
        if ($date === null) {
            return null;
        }

        return CarbonImmutable::instance($date)->utc()->format('Y-m-d\TH:i:s\Z');
    }

    /** Interprète une date ISO 8601 ; sans fuseau explicite, elle est lue en UTC. */
    public static function depuisIso(string $valeur): CarbonImmutable
    {
        return CarbonImmutable::parse($valeur, 'UTC')->utc();
    }

    public static function maintenant(): CarbonImmutable
    {
        return CarbonImmutable::now('UTC');
    }

    public static function versUtc(CarbonInterface $date): CarbonImmutable
    {
        return CarbonImmutable::instance($date)->utc();
    }
}
