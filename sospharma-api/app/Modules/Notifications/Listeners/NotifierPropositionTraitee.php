<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Listeners;

use App\Commun\Erreurs\ServiceExterneIndisponible;
use App\Modules\Notifications\Models\Appareil;
use App\Modules\Notifications\Services\ExpoPush;
use App\Modules\Releves\Events\PropositionTraitee;
use Illuminate\Support\Facades\Log;

/**
 * Prévient l'appareil qui a proposé une pharmacie : en ligne, ou refusée.
 * Non bloquant : une panne d'Expo est journalisée, la validation par l'équipe reste acquise.
 */
final class NotifierPropositionTraitee
{
    public function __construct(private readonly ExpoPush $expo) {}

    public function handle(PropositionTraitee $evenement): void
    {
        $appareil = Appareil::query()->whereKey($evenement->appareilId)->where('actif', true)->first();
        if ($appareil === null || $appareil->jeton_expo === null) {
            return;
        }

        $message = $evenement->acceptee
            ? [
                'title' => 'Merci, votre proposition est en ligne',
                'body' => "{$evenement->nomPharmacie} est maintenant visible dans SOS Pharma 24.",
            ]
            : [
                'title' => 'Proposition non retenue',
                'body' => "Notre équipe n'a pas pu valider {$evenement->nomPharmacie}. Le motif est dans Mes propositions.",
            ];

        try {
            $tickets = $this->expo->envoyer([$message + [
                'to' => $appareil->jeton_expo,
                'sound' => 'default',
                'data' => [
                    'type' => 'proposition',
                    'proposition' => $evenement->propositionIdPublic,
                    'pharmacie' => $evenement->pharmacieIdPublic,
                ],
            ]]);
        } catch (ServiceExterneIndisponible $e) {
            Log::warning('Notification de proposition non envoyée', ['proposition' => $evenement->propositionIdPublic, 'erreur' => $e->getMessage()]);

            return;
        }

        if (($tickets[0]['details']['error'] ?? null) === ExpoPush::ERREUR_APPAREIL_INCONNU) {
            $appareil->update(['jeton_expo' => null]);
        }
    }
}
