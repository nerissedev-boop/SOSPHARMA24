<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Middleware;

/** Alias « appareil.optionnel » : l'appareil est utilisé s'il est reconnu, sans être exigé. */
class IdentifierAppareilOptionnel extends IdentifierAppareil
{
    protected bool $obligatoire = false;
}
