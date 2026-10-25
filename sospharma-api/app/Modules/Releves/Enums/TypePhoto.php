<?php

declare(strict_types=1);

namespace App\Modules\Releves\Enums;

enum TypePhoto: string
{
    /** Obligatoire : devient la photo publique de la fiche à la validation. */
    case Facade = 'facade';
    case Enseigne = 'enseigne';
    case Horaires = 'horaires';
}
