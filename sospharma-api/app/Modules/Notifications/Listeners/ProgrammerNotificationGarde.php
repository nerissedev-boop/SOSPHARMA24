<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Listeners;

use App\Modules\Gardes\Events\TourGardePublie;
use App\Modules\Notifications\Services\PlanificationNotificationGarde;

/** Réagit à la publication d'un tour : programme la notification du samedi matin. */
final class ProgrammerNotificationGarde
{
    public function __construct(private readonly PlanificationNotificationGarde $planification) {}

    public function handle(TourGardePublie $evenement): void
    {
        $this->planification->programmer(
            $evenement->tourIdPublic,
            $evenement->villeId,
            $evenement->debut,
            $evenement->fin,
            $evenement->nombrePharmacies,
            $evenement->pharmaciesParZone,
        );
    }
}
