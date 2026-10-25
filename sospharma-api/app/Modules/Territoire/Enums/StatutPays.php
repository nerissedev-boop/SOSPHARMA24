<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Enums;

enum StatutPays: string
{
    case Ouvert = 'ouvert';
    case Bientot = 'bientot';
}
