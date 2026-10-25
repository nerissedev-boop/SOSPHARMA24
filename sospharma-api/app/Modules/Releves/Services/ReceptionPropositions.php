<?php

declare(strict_types=1);

namespace App\Modules\Releves\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Geo\Distance;
use App\Commun\Support\Dates;
use App\Modules\Releves\Enums\OrigineReleve;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypeReleve;
use App\Modules\Releves\Models\Releve;
use App\Modules\Territoire\Exceptions\ZoneNonCouverte;
use App\Modules\Territoire\Services\ZoneDepuisPosition;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Propositions de pharmacies par les usagers, sans compte : un relevé d'origine « public » rattaché à l'appareil.
 * Seuls le nom, le téléphone, la position et la façade sont proposés ; jamais les gardes.
 */
final class ReceptionPropositions
{
    /** Écart maximal entre le repère et la position du téléphone : l'usager doit être devant la pharmacie. */
    public const ECART_MAX_M = 100;

    private const AVANCE_HORLOGE_MAX_MIN = 15;

    public function __construct(private readonly ZoneDepuisPosition $zones) {}

    /**
     * @param  array<string, mixed>  $donnees  validées par EnvoyerPropositionRequest
     * @return array{releve: Releve, cree: bool}
     */
    public function recevoir(int $appareilId, array $donnees): array
    {
        $identifiant = (string) $donnees['identifiant'];
        $existant = $this->existant($appareilId, $identifiant);
        if ($existant !== null) {
            return ['releve' => $existant, 'cree' => false];
        }

        $lat = (float) $donnees['latitude'];
        $lng = (float) $donnees['longitude'];
        $ecart = Distance::metres($lat, $lng, (float) $donnees['gps_latitude'], (float) $donnees['gps_longitude']);
        if ($ecart > self::ECART_MAX_M) {
            throw new DonneesInvalides('', ['latitude' => ['Le repère est à plus de '.self::ECART_MAX_M.' m de votre position : envoyez la proposition depuis la pharmacie.']]);
        }

        $zone = $this->zones->chercher($lat, $lng)
            ?? throw new ZoneNonCouverte('Cette position n\'est pas encore couverte par SOS Pharma 24.');

        $champs = ['nom' => trim((string) $donnees['nom'])];
        if ($zone->quartier !== null) {
            $champs['quartier'] = $zone->quartier->nom;
        }
        if (! empty($donnees['telephone'])) {
            $champs['telephone'] = (string) $donnees['telephone'];
        }

        try {
            $releve = Releve::query()->create([
                'identifiant_client' => $identifiant,
                'origine' => OrigineReleve::Public,
                'appareil_id' => $appareilId,
                'ville_id' => $zone->ville->id,
                'type' => TypeReleve::Creation,
                'latitude' => round($lat, 6),
                'longitude' => round($lng, 6),
                'precision_m' => (float) $donnees['precision_m'],
                'ajustement_m' => $ecart,
                'champs' => $champs,
                'doublons_ecartes' => array_values(array_unique(array_map('strval', (array) ($donnees['doublons_ecartes'] ?? [])))) ?: null,
                'statut' => StatutReleve::Envoye,
                'releve_le' => $this->releveLe((string) $donnees['releve_le']),
                'recu_le' => now(),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            $existant = $this->existant($appareilId, $identifiant);
            if ($existant === null) {
                throw $e;
            }

            return ['releve' => $existant, 'cree' => false];
        }

        return ['releve' => $releve->load(['photos', 'ville']), 'cree' => true];
    }

    /**
     * Fiabilité d'un appareil : propositions acceptées et refusées. Calculée sur la table des relevés,
     * sans dépendre du module Notifications qui possède les appareils.
     *
     * @return array{acceptees: int, refusees: int}
     */
    public static function fiabilite(int $appareilId): array
    {
        $parStatut = Releve::query()
            ->where('origine', OrigineReleve::Public->value)
            ->where('appareil_id', $appareilId)
            ->whereIn('statut', [StatutReleve::Valide->value, StatutReleve::Rejete->value])
            ->selectRaw('statut, count(*) as nombre')
            ->groupBy('statut')
            ->pluck('nombre', 'statut');

        return [
            'acceptees' => (int) ($parStatut[StatutReleve::Valide->value] ?? 0),
            'refusees' => (int) ($parStatut[StatutReleve::Rejete->value] ?? 0),
        ];
    }

    private function existant(int $appareilId, string $identifiant): ?Releve
    {
        return Releve::query()->where('appareil_id', $appareilId)->where('identifiant_client', $identifiant)->with(['photos', 'ville'])->first();
    }

    private function releveLe(string $valeur): CarbonImmutable
    {
        $date = Dates::depuisIso($valeur);
        if ($date->greaterThan(Dates::maintenant()->addMinutes(self::AVANCE_HORLOGE_MAX_MIN))) {
            throw new DonneesInvalides('', ['releve_le' => ['La date est dans le futur : vérifiez l\'heure du téléphone.']]);
        }

        return $date;
    }
}
