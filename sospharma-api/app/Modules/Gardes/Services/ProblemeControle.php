<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

final class ProblemeControle
{
    public const CHEVAUCHEMENT = 'chevauchement';

    public const PHARMACIE_INCONNUE = 'pharmacie_inconnue';

    public const PHARMACIE_AUTRE_VILLE = 'pharmacie_autre_ville';

    public const GARDE_HORS_TOUR = 'garde_hors_tour';

    public const TOUR_VIDE = 'tour_vide';

    public const NUIT_SANS_GARDE = 'nuit_sans_garde';

    /** Les problèmes qui empêchent la publication ; les autres sont des avertissements. */
    public const BLOQUANTS = [self::CHEVAUCHEMENT, self::PHARMACIE_INCONNUE, self::PHARMACIE_AUTRE_VILLE, self::GARDE_HORS_TOUR, self::TOUR_VIDE];

    /** @param array<string, string|null> $contexte */
    public function __construct(
        public readonly string $type,
        public readonly string $message,
        public readonly array $contexte = [],
    ) {}

    public function estBloquant(): bool
    {
        return in_array($this->type, self::BLOQUANTS, true);
    }

    /** @return array<string, mixed> */
    public function versTableau(): array
    {
        return ['type' => $this->type, 'message' => $this->message, 'bloquant' => $this->estBloquant()] + $this->contexte;
    }
}
