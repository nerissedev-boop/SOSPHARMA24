<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Events;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Émis après la publication (transaction validée) d'un tour de garde.
 * Données simples uniquement : les modules qui écoutent n'ont pas à connaître les modèles de Gardes.
 */
final class TourGardePublie
{
    use Dispatchable;

    /** @param array<int, int> $pharmaciesParZone id interne de zone => nombre de pharmacies de garde */
    public function __construct(
        public readonly string $tourIdPublic,
        public readonly int $villeId,
        public readonly CarbonImmutable $debut,
        public readonly CarbonImmutable $fin,
        public readonly int $nombrePharmacies,
        public readonly array $pharmaciesParZone,
    ) {}
}
