<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Contrats;

use Carbon\CarbonImmutable;

/**
 * Instantané d'une fiche de pharmacie, exposé aux modules qui ne doivent pas toucher au modèle
 * ni à la table (Relevés). Les clés de enTableau() sont celles des champs proposés d'un relevé.
 */
final class FichePharmacie
{
    /**
     * @param  list<string>  $services
     * @param  list<array{jour: int, ouverture: string, fermeture: string}>  $horaires
     * @param  list<array{id: string, nom: string, tiers_payant: bool}>  $assurances
     */
    public function __construct(
        public readonly int $id,
        public readonly string $idPublic,
        public readonly int $villeId,
        public readonly ?int $zoneId,
        public readonly ?string $zoneNom,
        public readonly string $nom,
        public readonly string $adresse,
        public readonly ?string $quartier,
        public readonly ?string $telephone,
        public readonly ?string $whatsapp,
        public readonly ?float $latitude,
        public readonly ?float $longitude,
        public readonly bool $h24,
        public readonly array $services,
        public readonly array $horaires,
        public readonly array $assurances,
        public readonly ?string $photoFacadeUrl,
        public readonly ?CarbonImmutable $verifieeLe,
        public readonly bool $actif,
    ) {}

    /**
     * Champs comparables avec un relevé (comparaison avant / après).
     *
     * @return array<string, mixed>
     */
    public function enTableau(): array
    {
        return [
            'nom' => $this->nom,
            'adresse' => $this->adresse,
            'quartier' => $this->quartier,
            'telephone' => $this->telephone,
            'whatsapp' => $this->whatsapp,
            'h24' => $this->h24,
            'services' => $this->services,
            'horaires' => $this->horaires,
            'assurances' => array_map(fn (array $a): array => ['id' => $a['id'], 'tiers_payant' => $a['tiers_payant']], $this->assurances),
            'position' => $this->latitude !== null && $this->longitude !== null ? ['lat' => $this->latitude, 'lng' => $this->longitude] : null,
        ];
    }
}
