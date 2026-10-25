<?php

declare(strict_types=1);

namespace App\Modules\Releves\Policies;

use App\Commun\Securite\CompteAvecRole;
use App\Commun\Securite\Role;
use App\Modules\Releves\Models\Releve;

/**
 * agent_terrain : crée des relevés dans ses villes seulement, voit et corrige les siens.
 * admin : toute la file. editeur_ville : la file de sa ville.
 */
class RelevePolicy
{
    /** L'agent relève-t-il dans cette ville (identifiant interne) ? */
    public function create(CompteAvecRole $compte, int $villeId): bool
    {
        return $compte->role() === Role::AgentTerrain && in_array($villeId, $compte->villesAutorisees(), true);
    }

    /** Agent : son propre relevé (consultation, photos, correction). */
    public function modifier(CompteAvecRole $compte, Releve $releve): bool
    {
        return $compte->role() === Role::AgentTerrain
            && $releve->agent_id === $compte->idInterne()
            // Une ville retirée à l'agent ferme aussi ses relevés en cours.
            && in_array($releve->ville_id, $compte->villesAutorisees(), true);
    }

    public function viewAny(CompteAvecRole $compte): bool
    {
        return $compte->role()->estEquipe();
    }

    public function view(CompteAvecRole $compte, Releve $releve): bool
    {
        return $this->traiter($compte, $releve);
    }

    public function traiter(CompteAvecRole $compte, Releve $releve): bool
    {
        if ($compte->estAdmin()) {
            return true;
        }

        return $compte->role() === Role::EditeurVille && $compte->villeId() === $releve->ville_id;
    }
}
