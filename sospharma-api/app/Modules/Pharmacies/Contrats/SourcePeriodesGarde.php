<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Contrats;

use Carbon\CarbonImmutable;

/**
 * Les gardes publiées, dont la règle de statut a besoin.
 * Pharmacies ne dépend pas de Gardes : c'est le module Gardes qui fournit l'implémentation.
 */
interface SourcePeriodesGarde
{
    /**
     * Gardes publiées couvrant l'instant, pour les pharmacies données.
     *
     * @param  list<int>  $pharmacieIds
     * @return array<int, PeriodeGarde> indexé par id interne de pharmacie
     */
    public function gardesEnCours(array $pharmacieIds, CarbonImmutable $instant): array;

    /**
     * Toutes les pharmacies de garde à l'instant (éventuellement dans une ville).
     *
     * @return array<int, PeriodeGarde> indexé par id interne de pharmacie
     */
    public function pharmaciesDeGarde(CarbonImmutable $instant, ?int $villeId = null): array;
}
