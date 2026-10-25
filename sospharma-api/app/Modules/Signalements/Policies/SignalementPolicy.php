<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Policies;

use App\Commun\Securite\CompteAvecRole;
use App\Modules\Signalements\Models\Signalement;

/** admin : tous. editeur_ville : les signalements des pharmacies de sa ville. */
class SignalementPolicy
{
    public function viewAny(CompteAvecRole $compte): bool
    {
        return $compte->role()->estEquipe();
    }

    public function view(CompteAvecRole $compte, Signalement $signalement): bool
    {
        return $this->gere($compte, $signalement);
    }

    public function traiter(CompteAvecRole $compte, Signalement $signalement): bool
    {
        return $this->gere($compte, $signalement);
    }

    private function gere(CompteAvecRole $compte, Signalement $signalement): bool
    {
        if ($compte->estAdmin()) {
            return true;
        }

        return $compte->role()->estEquipe() && $compte->villeId() === $signalement->pharmacie->ville_id;
    }
}
