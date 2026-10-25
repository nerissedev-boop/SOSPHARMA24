<?php

declare(strict_types=1);

namespace App\Commun\Securite;

enum Role: string
{
    case Admin = 'admin';
    case EditeurVille = 'editeur_ville';
    case Pharmacien = 'pharmacien';
    /** Relève les pharmacies sur le terrain depuis l'app mobile (module Relevés), dans ses villes. */
    case AgentTerrain = 'agent_terrain';

    public function estEquipe(): bool
    {
        return $this === self::Admin || $this === self::EditeurVille;
    }
}
