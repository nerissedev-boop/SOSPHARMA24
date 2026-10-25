<?php

declare(strict_types=1);

namespace App\Commun\Securite;

/**
 * Ce que les modules savent d'un compte connecté, sans dépendre du module Comptes.
 */
interface CompteAvecRole
{
    public function idInterne(): int;

    public function role(): Role;

    /** Ville rattachée (éditeur de ville), identifiant interne. */
    public function villeId(): ?int;

    /**
     * Villes où le compte peut agir, identifiants internes : la ville de l'éditeur,
     * les villes rattachées d'un agent terrain, aucune pour les autres rôles.
     *
     * @return list<int>
     */
    public function villesAutorisees(): array;

    public function estActif(): bool;

    public function estAdmin(): bool;
}
