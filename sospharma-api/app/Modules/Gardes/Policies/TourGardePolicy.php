<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Policies;

use App\Commun\Securite\CompteAvecRole;
use App\Modules\Gardes\Models\TourGarde;

/** admin : toutes les villes. editeur_ville : saisir, contrôler et publier les tours de sa ville. */
class TourGardePolicy
{
    public function viewAny(CompteAvecRole $compte): bool
    {
        return $compte->role()->estEquipe();
    }

    public function view(CompteAvecRole $compte, TourGarde $tour): bool
    {
        return $this->gereVille($compte, $tour->ville_id);
    }

    public function create(CompteAvecRole $compte, int $villeId): bool
    {
        return $this->gereVille($compte, $villeId);
    }

    public function update(CompteAvecRole $compte, TourGarde $tour): bool
    {
        return $this->gereVille($compte, $tour->ville_id);
    }

    public function delete(CompteAvecRole $compte, TourGarde $tour): bool
    {
        return $this->gereVille($compte, $tour->ville_id);
    }

    public function publier(CompteAvecRole $compte, TourGarde $tour): bool
    {
        return $this->gereVille($compte, $tour->ville_id);
    }

    private function gereVille(CompteAvecRole $compte, int $villeId): bool
    {
        return $compte->estAdmin() || ($compte->role()->estEquipe() && $compte->villeId() === $villeId);
    }
}
