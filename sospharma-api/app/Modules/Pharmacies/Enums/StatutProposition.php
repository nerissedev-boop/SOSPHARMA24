<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Enums;

/** Proposition d'une assurance absente du référentiel (agent terrain ou pharmacien), validée par l'équipe. */
enum StatutProposition: string
{
    case EnAttente = 'en_attente';
    case Acceptee = 'acceptee';
    case Rejetee = 'rejetee';
}
