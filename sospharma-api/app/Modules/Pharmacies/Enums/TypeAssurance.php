<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Enums;

/** Type d'assurance du référentiel d'un pays. */
enum TypeAssurance: string
{
    case Publique = 'publique';
    case Mutuelle = 'mutuelle';
    case Privee = 'privee';

    public function libelle(): string
    {
        return match ($this) {
            self::Publique => 'Régime public',
            self::Mutuelle => 'Mutuelle',
            self::Privee => 'Assureur privé',
        };
    }

    /** Ordre d'affichage : régimes publics d'abord, puis mutuelles, puis assureurs privés. */
    public function rang(): int
    {
        return match ($this) {
            self::Publique => 0,
            self::Mutuelle => 1,
            self::Privee => 2,
        };
    }
}
