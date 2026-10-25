<?php

declare(strict_types=1);

namespace App\Modules\Releves\Enums;

enum OrigineReleve: string
{
    /** Agent terrain connecté (espace agent). */
    case Agent = 'agent';
    /** Usager anonyme de l'app (« Proposer une pharmacie »), identifié par son appareil. */
    case Public = 'public';
}
