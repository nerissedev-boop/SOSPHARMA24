<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Enums;

enum TypeZone: string
{
    case Commune = 'commune';
    case Quartier = 'quartier';
}
