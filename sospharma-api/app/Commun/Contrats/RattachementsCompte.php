<?php

declare(strict_types=1);

namespace App\Commun\Contrats;

/**
 * Pharmacies gérées par un compte pharmacien, pour /auth/moi, sans que Comptes dépende de Pharmacies.
 * Implémenté et lié par le module Pharmacies.
 */
interface RattachementsCompte
{
    /** @return list<array{id: string, nom: string}> */
    public function pharmaciesDuCompte(int $compteId): array;
}
