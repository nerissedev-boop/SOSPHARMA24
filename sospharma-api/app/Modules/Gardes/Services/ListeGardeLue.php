<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use Carbon\CarbonImmutable;

/** Résultat de la lecture d'une liste de garde : période annoncée dans l'en-tête et pharmacies. */
final class ListeGardeLue
{
    /** @param list<EntreeListeGarde> $entrees */
    public function __construct(
        public readonly ?CarbonImmutable $premierJour,
        public readonly ?CarbonImmutable $dernierJour,
        public readonly array $entrees,
    ) {}
}
