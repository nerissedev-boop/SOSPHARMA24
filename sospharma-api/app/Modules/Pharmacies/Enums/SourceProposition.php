<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Enums;

/** D'où vient une proposition d'assurance. */
enum SourceProposition: string
{
    case Releve = 'releve';
    case Pharmacien = 'pharmacien';
    /** Ancien champ texte « assurances » des pharmacies, sans correspondance dans le référentiel. */
    case Migration = 'migration';
}
