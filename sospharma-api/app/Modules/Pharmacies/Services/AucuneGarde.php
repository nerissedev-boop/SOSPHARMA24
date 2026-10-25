<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Modules\Pharmacies\Contrats\SourcePeriodesGarde;
use Carbon\CarbonImmutable;

/** Implémentation par défaut tant que le module Gardes n'est pas chargé. */
final class AucuneGarde implements SourcePeriodesGarde
{
    public function gardesEnCours(array $pharmacieIds, CarbonImmutable $instant): array
    {
        return [];
    }

    public function pharmaciesDeGarde(CarbonImmutable $instant, ?int $villeId = null): array
    {
        return [];
    }
}
