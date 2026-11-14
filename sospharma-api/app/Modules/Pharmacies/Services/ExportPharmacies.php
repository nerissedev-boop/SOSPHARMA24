<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Support\EcrivainCsv;
use App\Commun\Support\NumerosTelephone;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Models\TelephonePharmacie;
use App\Modules\Territoire\Models\Zone;

/**
 * L'annuaire en CSV, à corriger dans Excel et à renvoyer tel quel à ImportPharmacies (décision 60).
 *
 * Chaque cellule est écrite comme l'import la relit, pour qu'un aller-retour sans retouche donne
 * des lignes « inchangées » : `id` reconnaît la fiche, les numéros sont tous là (principal en premier),
 * les assurances sont les slugs actifs du référentiel (une assurance retirée mettrait la ligne en erreur).
 */
final class ExportPharmacies
{
    public const COLONNES = ['id', 'nom', 'adresse', 'quartier', 'commune', 'telephone', 'whatsapp', 'latitude', 'longitude', 'h24', 'services', 'assurances'];

    /** @var array<string, NumerosTelephone> par indicatif */
    private array $numeros = [];

    /** @var array<int, array<string, int>> ville_id → nom de zone en minuscules → nombre de zones qui le portent */
    private array $nomsDeZones = [];

    /**
     * Les pharmacies doivent arriver avec ville.pays, zone, assurances et telephones chargés.
     *
     * @param  resource  $flux
     * @param  iterable<Pharmacie>  $pharmacies
     * @return int nombre de lignes écrites (sans l'en-tête)
     */
    public function ecrire($flux, iterable $pharmacies): int
    {
        fwrite($flux, EcrivainCsv::BOM);
        EcrivainCsv::ligne($flux, self::COLONNES);

        $total = 0;
        foreach ($pharmacies as $pharmacie) {
            EcrivainCsv::ligne($flux, $this->ligne($pharmacie));
            $total++;
        }

        return $total;
    }

    /** @return list<string|null> */
    private function ligne(Pharmacie $p): array
    {
        $numeros = $this->numeros[$indicatif = (string) ($p->ville->pays->indicatif ?? '')] ??= NumerosTelephone::pour($indicatif);
        $ecrire = fn (TelephonePharmacie $t): string => $numeros->pourTableur($t->numero);

        return [
            $p->id_public,
            $p->nom,
            $p->adresse,
            $p->quartier,
            $p->zone !== null ? $this->commune($p->zone) : null,
            $p->telephones->map($ecrire)->implode(' / '),
            $p->telephones->where('whatsapp', true)->map($ecrire)->implode(' / '),
            $p->latitude,
            $p->longitude,
            $p->h24 ? 'oui' : 'non',
            implode(' | ', (array) $p->services),
            $p->assurances->where('actif', true)->sortBy('slug')->map(fn (Assurance $a): string => $a->slug)->implode(' | '),
        ];
    }

    /** Le nom, plus parlant ; l'identifiant zo_… si une autre zone de la ville porte le même (commune et quartier). */
    private function commune(Zone $zone): string
    {
        $noms = $this->nomsDeZones[$zone->ville_id] ??= array_count_values(
            Zone::query()->where('ville_id', $zone->ville_id)->pluck('nom')->map(fn (string $n): string => mb_strtolower($n))->all()
        );

        return ($noms[mb_strtolower($zone->nom)] ?? 0) > 1 ? $zone->id_public : $zone->nom;
    }
}
