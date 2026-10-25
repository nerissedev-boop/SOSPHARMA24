<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Policies;

use App\Commun\Securite\CompteAvecRole;
use App\Commun\Securite\Role;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\PharmaciesDuCompte;

/**
 * admin : tout. editeur_ville : lire et corriger les fiches de sa ville.
 * pharmacien : lire et modifier sa propre pharmacie. agent_terrain : rien (il passe par les relevés).
 */
class PharmaciePolicy
{
    public function __construct(private readonly PharmaciesDuCompte $rattachements) {}

    public function viewAny(CompteAvecRole $compte): bool
    {
        return $compte->role()->estEquipe();
    }

    public function view(CompteAvecRole $compte, Pharmacie $pharmacie): bool
    {
        return $this->peutModifier($compte, $pharmacie);
    }

    public function create(CompteAvecRole $compte): bool
    {
        return $compte->estAdmin();
    }

    public function update(CompteAvecRole $compte, Pharmacie $pharmacie): bool
    {
        return $this->peutModifier($compte, $pharmacie);
    }

    public function delete(CompteAvecRole $compte, Pharmacie $pharmacie): bool
    {
        return $compte->estAdmin();
    }

    public function import(CompteAvecRole $compte): bool
    {
        return $compte->estAdmin();
    }

    private function peutModifier(CompteAvecRole $compte, Pharmacie $pharmacie): bool
    {
        return match ($compte->role()) {
            Role::Admin => true,
            Role::EditeurVille => $compte->villeId() === $pharmacie->ville_id,
            Role::Pharmacien => $this->rattachements->gere($compte, $pharmacie->id),
            // L'agent terrain ne modifie jamais une fiche : il propose un relevé, validé par l'équipe.
            Role::AgentTerrain => false,
        };
    }
}
