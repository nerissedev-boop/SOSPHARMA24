<?php

declare(strict_types=1);

namespace App\Modules\Releves\Events;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * Émis après la validation ou le rejet (transaction validée) d'une proposition d'usager.
 * Données simples uniquement : Notifications prévient l'appareil sans connaître les modèles de Relevés.
 */
final class PropositionTraitee
{
    use Dispatchable;

    public function __construct(
        public readonly int $appareilId,
        public readonly string $propositionIdPublic,
        public readonly bool $acceptee,
        public readonly string $nomPharmacie,
        /** Identifiant public de la pharmacie publiée (acceptée seulement), pour ouvrir sa fiche depuis la notification. */
        public readonly ?string $pharmacieIdPublic = null,
    ) {}
}
