<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Policies;

use App\Commun\Securite\CompteAvecRole;
use App\Modules\Territoire\Models\Zone;

/** Admin : toutes les zones. Éditeur de ville : les zones de sa ville. */
class ZonePolicy
{
    public function viewAny(CompteAvecRole $compte): bool
    {
        return $compte->role()->estEquipe();
    }

    public function view(CompteAvecRole $compte, Zone $zone): bool
    {
        return $this->gereVille($compte, $zone->ville_id);
    }

    public function create(CompteAvecRole $compte, int $villeId): bool
    {
        return $this->gereVille($compte, $villeId);
    }

    public function update(CompteAvecRole $compte, Zone $zone): bool
    {
        return $this->gereVille($compte, $zone->ville_id);
    }

    public function delete(CompteAvecRole $compte, Zone $zone): bool
    {
        return $this->gereVille($compte, $zone->ville_id);
    }

    private function gereVille(CompteAvecRole $compte, int $villeId): bool
    {
        return $compte->estAdmin() || ($compte->role()->estEquipe() && $compte->villeId() === $villeId);
    }
}
