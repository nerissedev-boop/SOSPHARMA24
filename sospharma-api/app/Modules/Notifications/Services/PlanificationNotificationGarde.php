<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Services;

use App\Modules\Notifications\Models\EnvoiNotification;
use App\Modules\Territoire\Services\ConfigurationPays;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/** Prépare l'envoi du samedi matin (heure locale de la ville) pour un tour publié. */
final class PlanificationNotificationGarde
{
    public function __construct(private readonly ConfigurationPays $configuration) {}

    /** @param array<int, int> $pharmaciesParZone */
    public function programmer(string $tourIdPublic, int $villeId, CarbonImmutable $debut, CarbonImmutable $fin, int $nombre, array $pharmaciesParZone): EnvoiNotification
    {
        return EnvoiNotification::query()->updateOrCreate(
            ['type' => 'tour_garde', 'reference' => $tourIdPublic],
            [
                'ville_id' => $villeId,
                'titre' => 'Nouveau tour de garde',
                'contenu' => [
                    'debut' => $debut->utc()->toIso8601ZuluString(),
                    'fin' => $fin->utc()->toIso8601ZuluString(),
                    'nombre' => $nombre,
                    'par_zone' => $pharmaciesParZone,
                ],
                'statut' => EnvoiNotification::EN_ATTENTE,
                'programme_le' => $this->prochainSamediMatin($this->configuration->fuseauDeVille($villeId)),
                'tentatives' => 0,
                'curseur_appareil_id' => null,
                'derniere_erreur' => null,
            ],
        );
    }

    /** Samedi à l'heure configurée (08:00), heure locale ; un samedi après cette heure, tout de suite. */
    public function prochainSamediMatin(string $fuseau, ?CarbonInterface $maintenant = null): CarbonImmutable
    {
        $local = CarbonImmutable::instance($maintenant ?? now())->setTimezone($fuseau);
        [$h, $m] = array_map('intval', explode(':', (string) config('sospharma.expo.heure_samedi', '08:00')));

        if ($local->dayOfWeek === CarbonInterface::SATURDAY) {
            $cible = $local->setTime($h, $m);

            return ($cible->greaterThan($local) ? $cible : $local)->utc();
        }

        return $local->next(CarbonInterface::SATURDAY)->setTime($h, $m)->utc();
    }
}
