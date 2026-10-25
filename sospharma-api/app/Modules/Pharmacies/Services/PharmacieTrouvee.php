<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Modules\Pharmacies\Models\Pharmacie;

final class PharmacieTrouvee
{
    public function __construct(
        public readonly Pharmacie $pharmacie,
        public readonly ResultatStatut $statut,
        public readonly ?int $distanceM = null,
    ) {}
}
