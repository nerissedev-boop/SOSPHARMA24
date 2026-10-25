<?php

declare(strict_types=1);

namespace App\Modules\Releves\Enums;

/** État d'un relevé côté API (« en attente d'envoi » n'existe que sur le téléphone). */
enum StatutReleve: string
{
    case Envoye = 'envoye';
    case Valide = 'valide';
    case ACorriger = 'a_corriger';
    case Rejete = 'rejete';
}
