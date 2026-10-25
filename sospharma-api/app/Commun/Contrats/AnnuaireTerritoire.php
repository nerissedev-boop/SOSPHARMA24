<?php

declare(strict_types=1);

namespace App\Commun\Contrats;

/**
 * Accès minimal au territoire pour les modules qui ne doivent pas dépendre de Territoire
 * (Comptes, Support). Implémenté et lié par le module Territoire.
 */
interface AnnuaireTerritoire
{
    public function villeIdDepuisPublic(string $idPublic): ?int;

    /** @return array{id: string, nom: string}|null */
    public function resumeVille(int $villeId): ?array;
}
