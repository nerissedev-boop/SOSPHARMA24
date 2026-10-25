<?php

declare(strict_types=1);

namespace App\Modules\Releves\Enums;

enum TypeReleve: string
{
    /** Nouvelle pharmacie. */
    case Creation = 'creation';
    /** Mise à jour d'une pharmacie existante (« C'est la même » ou bouton « Mettre à jour »). */
    case MiseAJour = 'mise_a_jour';
}
