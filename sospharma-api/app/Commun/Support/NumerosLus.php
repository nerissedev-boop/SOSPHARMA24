<?php

declare(strict_types=1);

namespace App\Commun\Support;

/** Ce que NumerosTelephone a tiré d'une cellule : les numéros dans l'ordre, le premier étant le principal. */
final class NumerosLus
{
    /**
     * @param  list<string>  $numeros  format international E.164, sans doublon
     * @param  list<string>  $illisibles  morceaux qu'on ne sait pas lire, à citer dans le message d'erreur
     * @param  list<string>  $avertissements  numéros corrigés ou inhabituels, à faire vérifier
     */
    public function __construct(
        public readonly array $numeros,
        public readonly array $illisibles,
        public readonly array $avertissements,
    ) {}
}
