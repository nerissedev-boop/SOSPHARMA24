<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Contrats;

use App\Commun\Geo\Rectangle;

/**
 * Partie publique du module Pharmacies pour les modules au-dessus (Relevés) :
 * lire des fiches et les créer ou les mettre à jour sans toucher au modèle ni aux tables.
 *
 * Champs acceptés par creer() et mettreAJour() (tous facultatifs en mise à jour) :
 *   nom, adresse, quartier, telephone, whatsapp (E.164), h24 (bool), services (list<string>),
 *   horaires (list<{jour, ouverture, fermeture}>, remplace toutes les plages),
 *   assurances (list<{id: as_…, tiers_payant?: bool, remarque?: string}>, remplace toutes les assurances).
 * Les écritures marquent la fiche « vérifiée maintenant ». Elles doivent être appelées dans la transaction de l'appelant.
 */
interface EditionFichesPharmacies
{
    /**
     * Fiches dont la position tombe dans le rectangle (présélection ; la distance exacte est à calculer par l'appelant).
     *
     * @return list<FichePharmacie>
     */
    public function dansRectangle(Rectangle $rectangle, bool $activesSeulement = true, int $max = 200): array;

    public function parIdPublic(string $idPublic): ?FichePharmacie;

    public function parId(int $id): ?FichePharmacie;

    /** @param array<string, mixed> $champs */
    public function creer(array $champs, float $lat, float $lng, int $villeId): FichePharmacie;

    /** @param array<string, mixed> $champs */
    public function mettreAJour(int $pharmacieId, array $champs, ?float $lat = null, ?float $lng = null): FichePharmacie;

    /**
     * Rend publique une photo de façade (chemin sur le disque « public »).
     *
     * @return string|null chemin de l'ancienne photo, que l'appelant peut supprimer après validation de la transaction
     */
    public function definirPhotoFacade(int $pharmacieId, string $cheminPublic): ?string;

    /**
     * Assurances (identifiants publics) inconnues, désactivées ou d'un autre pays que la ville.
     *
     * @param  list<string>  $idsPublics
     * @return list<string>
     */
    public function assurancesInconnues(int $villeId, array $idsPublics): array;

    /**
     * Noms libres d'assurances absentes du référentiel, à valider par l'équipe.
     *
     * @param  list<string>  $noms
     * @return int nombre de propositions créées
     */
    public function proposerAssurances(int $villeId, ?int $pharmacieId, array $noms, ?int $auteurId, ?int $releveId): int;
}
