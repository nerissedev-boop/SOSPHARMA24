<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

/** Une pharmacie lue dans la liste de garde officielle : « PHCIE NOM / M. PHARMACIEN – TEL. … / repère ». */
final class EntreeListeGarde
{
    /**
     * @param  list<string>  $telephones  numéros valides à 10 chiffres (« 2735913604 »)
     * @param  list<string>  $telephonesInvalides  morceaux de numéros illisibles, tels que lus
     */
    public function __construct(
        public readonly ?string $section,
        public readonly string $nom,
        public readonly ?string $pharmacien,
        public readonly array $telephones,
        public readonly array $telephonesInvalides,
        public readonly bool $telephonesCorriges,
        public readonly ?string $repere,
        public readonly bool $nouvelle,
        public readonly string $texte,
    ) {}

    /** @return array<string, mixed> */
    public function versTableau(): array
    {
        return [
            'section' => $this->section,
            'nom' => $this->nom,
            'pharmacien' => $this->pharmacien,
            'telephones' => $this->telephones,
            'telephones_invalides' => $this->telephonesInvalides,
            'telephones_corriges' => $this->telephonesCorriges,
            'repere' => $this->repere,
            'nouvelle' => $this->nouvelle,
            'texte' => $this->texte,
        ];
    }
}
