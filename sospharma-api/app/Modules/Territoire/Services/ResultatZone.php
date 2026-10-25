<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Services;

use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;

final class ResultatZone
{
    public function __construct(
        public readonly Zone $commune,
        public readonly ?Zone $quartier,
        public readonly Ville $ville,
    ) {}
}
