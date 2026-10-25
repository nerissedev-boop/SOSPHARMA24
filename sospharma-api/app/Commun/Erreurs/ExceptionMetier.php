<?php

declare(strict_types=1);

namespace App\Commun\Erreurs;

use RuntimeException;
use Throwable;

/**
 * Exception métier : liée à un code d'erreur, un message lisible par l'usager
 * et éventuellement des détails par champ. Chaque module en dérive les siennes.
 */
abstract class ExceptionMetier extends RuntimeException
{
    /** @param array<string, list<string>|string>|null $details */
    public function __construct(
        string $message = '',
        protected ?array $details = null,
        ?Throwable $precedente = null,
    ) {
        parent::__construct($message !== '' ? $message : $this->codeErreur()->messageParDefaut(), 0, $precedente);
    }

    abstract public function codeErreur(): CodeErreur;

    public function statutHttp(): int
    {
        return $this->codeErreur()->statutHttp();
    }

    /** @return array<string, mixed>|null */
    public function details(): ?array
    {
        return $this->details;
    }
}
