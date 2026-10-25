<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Carbon;

/**
 * Lien pharmacie ↔ assurance (table pharmacie_assurances).
 *
 * @property int $pharmacie_id
 * @property int $assurance_id
 * @property bool $tiers_payant
 * @property string|null $remarque
 * @property Carbon|null $verifiee_le
 */
class PharmacieAssurance extends Pivot
{
    public $incrementing = true;

    protected $table = 'pharmacie_assurances';

    protected function casts(): array
    {
        return [
            'tiers_payant' => 'boolean',
            'verifiee_le' => 'datetime',
        ];
    }
}
