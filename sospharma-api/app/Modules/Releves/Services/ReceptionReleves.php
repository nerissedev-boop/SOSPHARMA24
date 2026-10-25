<?php

declare(strict_types=1);

namespace App\Modules\Releves\Services;

use App\Commun\Erreurs\ActionInterdite;
use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\CompteAvecRole;
use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Releves\Enums\OrigineReleve;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypeReleve;
use App\Modules\Releves\Exceptions\ReleveNonModifiable;
use App\Modules\Releves\Models\Releve;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Services\ZoneDepuisPosition;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/** Réception des relevés envoyés par les agents (idempotente) et correction des relevés « à corriger ». */
final class ReceptionReleves
{
    /** Champs qu'un relevé peut proposer (voir EnregistrerReleveRequest). */
    public const CHAMPS = ['nom', 'adresse', 'quartier', 'telephone', 'whatsapp', 'h24', 'services', 'horaires', 'assurances', 'assurances_proposees'];

    /** Tolérance sur l'horloge du téléphone pour « relevé le ». */
    private const AVANCE_HORLOGE_MAX_MIN = 15;

    public function __construct(
        private readonly EditionFichesPharmacies $fiches,
        private readonly ZoneDepuisPosition $zones,
    ) {}

    /**
     * Crée le relevé, ou renvoie celui déjà reçu avec le même identifiant (renvoi depuis la file du téléphone).
     *
     * @param  array<string, mixed>  $donnees  validées par EnregistrerReleveRequest
     * @return array{releve: Releve, cree: bool}
     */
    public function recevoir(CompteAvecRole $agent, array $donnees): array
    {
        $existant = $this->existant($agent, (string) $donnees['identifiant']);
        if ($existant !== null) {
            return ['releve' => $existant, 'cree' => false];
        }

        $lat = (float) $donnees['latitude'];
        $lng = (float) $donnees['longitude'];
        $pharmacieId = null;
        if (! empty($donnees['pharmacie'])) {
            $fiche = $this->fiches->parIdPublic((string) $donnees['pharmacie'])
                ?? throw new DonneesInvalides('', ['pharmacie' => ['Pharmacie inconnue.']]);
            $type = TypeReleve::MiseAJour;
            $villeId = $fiche->villeId;
            $pharmacieId = $fiche->id;
        } else {
            $type = TypeReleve::Creation;
            $villeId = $this->ville($lat, $lng, $donnees['ville'] ?? null);
        }

        $this->autoriser($agent, $villeId);
        $champs = $this->champs((array) ($donnees['champs'] ?? []), $villeId);
        if ($type === TypeReleve::Creation) {
            foreach (['nom', 'adresse'] as $obligatoire) {
                if (empty($champs[$obligatoire])) {
                    throw new DonneesInvalides('', ["champs.{$obligatoire}" => ['Ce champ est obligatoire pour une nouvelle pharmacie.']]);
                }
            }
        }

        try {
            $releve = Releve::query()->create([
                'identifiant_client' => (string) $donnees['identifiant'],
                'origine' => OrigineReleve::Agent,
                'agent_id' => $agent->idInterne(),
                'ville_id' => $villeId,
                'pharmacie_id' => $pharmacieId,
                'type' => $type,
                'latitude' => round($lat, 6),
                'longitude' => round($lng, 6),
                'precision_m' => (float) $donnees['precision_m'],
                'ajustement_m' => isset($donnees['ajustement_m']) ? (int) $donnees['ajustement_m'] : null,
                'champs' => $champs,
                'statut' => StatutReleve::Envoye,
                'releve_le' => $this->releveLe((string) $donnees['releve_le']),
                'recu_le' => now(),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            // Deux envois simultanés du même relevé : le second renvoie le premier.
            $existant = $this->existant($agent, (string) $donnees['identifiant']);
            if ($existant === null) {
                throw $e;
            }

            return ['releve' => $existant, 'cree' => false];
        }

        return ['releve' => $releve->load('photos'), 'cree' => true];
    }

    /**
     * PATCH par l'agent d'un relevé « à corriger » : il repart dans la file (« envoyé »).
     *
     * @param  array<string, mixed>  $donnees
     */
    public function corriger(Releve $releve, CompteAvecRole $agent, array $donnees): Releve
    {
        return DB::transaction(function () use ($releve, $agent, $donnees): Releve {
            /** @var Releve $verrouille */
            $verrouille = Releve::query()->whereKey($releve->id)->lockForUpdate()->firstOrFail();
            if ($verrouille->statut !== StatutReleve::ACorriger) {
                throw new ReleveNonModifiable('Seul un relevé « à corriger » peut être modifié.');
            }

            $attributs = [];
            if (isset($donnees['latitude'], $donnees['longitude'])) {
                $attributs['latitude'] = round((float) $donnees['latitude'], 6);
                $attributs['longitude'] = round((float) $donnees['longitude'], 6);
                if ($verrouille->type === TypeReleve::Creation) {
                    $attributs['ville_id'] = $this->ville((float) $donnees['latitude'], (float) $donnees['longitude'], $donnees['ville'] ?? null);
                    $this->autoriser($agent, $attributs['ville_id']);
                }
            }
            foreach (['precision_m' => 'float', 'ajustement_m' => 'int'] as $champ => $typage) {
                if (array_key_exists($champ, $donnees)) {
                    $attributs[$champ] = $donnees[$champ] === null ? null : ($typage === 'int' ? (int) $donnees[$champ] : (float) $donnees[$champ]);
                }
            }
            if (array_key_exists('champs', $donnees)) {
                $champs = array_replace($verrouille->champs ?? [], $this->champs((array) $donnees['champs'], $attributs['ville_id'] ?? $verrouille->ville_id));
                $attributs['champs'] = $champs;
            }
            if (isset($donnees['releve_le'])) {
                $attributs['releve_le'] = $this->releveLe((string) $donnees['releve_le']);
            }

            $verrouille->update($attributs + [
                'statut' => StatutReleve::Envoye,
                'recu_le' => now(),
                'traite_par' => null,
                'traite_le' => null,
            ]);

            return $verrouille->load('photos');
        });
    }

    private function existant(CompteAvecRole $agent, string $identifiant): ?Releve
    {
        return Releve::query()->where('agent_id', $agent->idInterne())->where('identifiant_client', $identifiant)->with('photos')->first();
    }

    /** Ville déduite de la position (commune connue) ; sinon la ville donnée par l'app. */
    private function ville(float $lat, float $lng, mixed $villePublique): int
    {
        $detectee = $this->zones->chercher($lat, $lng);
        if ($detectee !== null) {
            return $detectee->ville->id;
        }
        if (is_string($villePublique) && $villePublique !== '') {
            $id = Ville::query()->where('id_public', $villePublique)->value('id');
            if ($id !== null) {
                return (int) $id;
            }
        }

        throw new DonneesInvalides('', ['ville' => ['La position n\'est dans aucune commune connue : précisez la ville.']]);
    }

    private function autoriser(CompteAvecRole $agent, int $villeId): void
    {
        if (Gate::forUser($agent)->denies('create', [Releve::class, $villeId])) {
            throw new ActionInterdite('Vous ne pouvez relever des pharmacies que dans vos villes.');
        }
    }

    /**
     * Normalise les champs proposés et vérifie les assurances auprès du module Pharmacies.
     *
     * @param  array<string, mixed>  $champs
     * @return array<string, mixed>
     */
    public function champs(array $champs, int $villeId): array
    {
        $propres = array_intersect_key($champs, array_flip(self::CHAMPS));
        foreach (['nom', 'adresse', 'quartier'] as $texte) {
            if (isset($propres[$texte]) && is_string($propres[$texte])) {
                $propres[$texte] = trim($propres[$texte]);
            }
        }
        if (isset($propres['assurances'])) {
            $propres['assurances'] = array_values(array_map(fn (array $a): array => [
                'id' => (string) $a['id'],
                'tiers_payant' => (bool) ($a['tiers_payant'] ?? false),
            ], (array) $propres['assurances']));
            $inconnues = $this->fiches->assurancesInconnues($villeId, array_column($propres['assurances'], 'id'));
            if ($inconnues !== []) {
                throw new DonneesInvalides('', ['champs.assurances' => ['Assurance inconnue dans ce pays : '.implode(', ', $inconnues).'.']]);
            }
        }

        return $propres;
    }

    private function releveLe(string $valeur): CarbonImmutable
    {
        $date = Dates::depuisIso($valeur);
        if ($date->greaterThan(Dates::maintenant()->addMinutes(self::AVANCE_HORLOGE_MAX_MIN))) {
            throw new DonneesInvalides('', ['releve_le' => ['La date du relevé est dans le futur : vérifiez l\'heure du téléphone.']]);
        }

        return $date;
    }
}
