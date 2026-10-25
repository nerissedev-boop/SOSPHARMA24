<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Contrats;

use Carbon\CarbonImmutable;

/** Une période de garde publiée d'une pharmacie (dates UTC). */
final class PeriodeGarde
{
    public function __construct(
        public readonly int $pharmacieId,
        public readonly CarbonImmutable $debut,
        public readonly CarbonImmutable $fin,
        public readonly ?CarbonImmutable $confirmeeLe = null,
        public readonly ?string $tourIdPublic = null,
    ) {}

    public function couvre(CarbonImmutable $instant): bool
    {
        return $this->debut->lessThanOrEqualTo($instant) && $instant->lessThan($this->fin);
    }
}
