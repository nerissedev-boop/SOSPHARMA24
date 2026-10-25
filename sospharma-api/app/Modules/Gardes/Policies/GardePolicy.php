<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Policies;

use App\Commun\Securite\CompteAvecRole;
use App\Commun\Securite\Role;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Pharmacies\Services\PharmaciesDuCompte;

/** Un pharmacien ne confirme que les gardes de ses pharmacies. */
class GardePolicy
{
    public function __construct(private readonly PharmaciesDuCompte $rattachements) {}

    public function confirmer(CompteAvecRole $compte, Garde $garde): bool
    {
        return $compte->role() === Role::Pharmacien && $this->rattachements->gere($compte, $garde->pharmacie_id);
    }
}
