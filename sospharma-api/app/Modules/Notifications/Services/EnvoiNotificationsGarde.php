<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Services;

use App\Commun\Erreurs\ServiceExterneIndisponible;
use App\Modules\Notifications\Models\Appareil;
use App\Modules\Notifications\Models\EnvoiNotification;
use App\Modules\Territoire\Models\Zone;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;

/**
 * Envoie les notifications « nouveau tour de garde » arrivées à échéance, par lots de 100 vers Expo Push.
 * En cas de panne d'Expo : on journalise, on garde la position atteinte et on réessaie plus tard.
 */
final class EnvoiNotificationsGarde
{
    public function __construct(private readonly ExpoPush $expo) {}

    /** @return list<EnvoiNotification> envois traités */
    public function envoyerEnAttente(bool $ignorerProgrammation = false): array
    {
        $envois = EnvoiNotification::query()
            ->where('type', 'tour_garde')
            ->where('statut', EnvoiNotification::EN_ATTENTE)
            ->when(! $ignorerProgrammation, fn ($r) => $r->where('programme_le', '<=', now()))
            ->orderBy('programme_le')
            ->get();

        $traites = [];
        foreach ($envois as $envoi) {
            // Verrou optimiste : une seule exécution du planificateur prend l'envoi.
            $pris = EnvoiNotification::query()->whereKey($envoi->id)->where('statut', EnvoiNotification::EN_ATTENTE)
                ->update(['statut' => EnvoiNotification::EN_COURS]);
            if ($pris === 1) {
                $traites[] = $this->traiter($envoi->refresh());
            }
        }

        return $traites;
    }

    public function traiter(EnvoiNotification $envoi): EnvoiNotification
    {
        $contenu = $envoi->contenu ?? [];
        $parZone = array_map('intval', (array) ($contenu['par_zone'] ?? []));
        $nomsZones = Zone::query()->whereIn('id', array_keys($parZone))->pluck('nom', 'id');
        $nomVille = $envoi->ville?->nom ?? 'votre ville';
        $total = (int) ($contenu['nombre'] ?? 0);

        try {
            Appareil::query()
                ->where('ville_id', $envoi->ville_id)
                ->where('actif', true)
                ->where('notification_garde', true)
                ->whereNotNull('jeton_expo')
                ->when($envoi->curseur_appareil_id !== null, fn ($r) => $r->where('id', '>', $envoi->curseur_appareil_id))
                ->chunkById((int) config('sospharma.expo.taille_lot', 100), function ($appareils) use ($envoi, $parZone, $nomsZones, $nomVille, $total): void {
                    $messages = [];
                    foreach ($appareils as $appareil) {
                        $messages[] = [
                            'to' => (string) $appareil->jeton_expo,
                            'title' => 'Nouveau tour de garde',
                            'body' => $this->texte($appareil->zone_id, $parZone, $nomsZones->all(), $nomVille, $total),
                            'sound' => 'default',
                            'data' => ['type' => 'tour_garde', 'tour' => $envoi->reference],
                        ];
                    }

                    $tickets = $this->expo->envoyer($messages);
                    $echecs = 0;
                    foreach ($tickets as $i => $ticket) {
                        if (($ticket['status'] ?? null) === 'ok') {
                            continue;
                        }
                        $echecs++;
                        if (($ticket['details']['error'] ?? null) === ExpoPush::ERREUR_APPAREIL_INCONNU) {
                            // Jeton refusé par Expo (application désinstallée…) : désactivé automatiquement.
                            Appareil::query()->whereKey($appareils[$i]->id)->update(['jeton_expo' => null]);
                        }
                    }

                    $envoi->forceFill([
                        'destinataires' => $envoi->destinataires + count($messages),
                        'echecs' => $envoi->echecs + $echecs,
                        'curseur_appareil_id' => $appareils->last()->id,
                    ])->save();
                });
        } catch (ServiceExterneIndisponible $e) {
            return $this->reporter($envoi, $e->getMessage());
        }

        $envoi->forceFill(['statut' => EnvoiNotification::ENVOYE, 'envoye_le' => now(), 'derniere_erreur' => null])->save();
        Log::info('Notification de garde envoyée', ['envoi' => $envoi->id_public, 'destinataires' => $envoi->destinataires, 'echecs' => $envoi->echecs]);

        return $envoi;
    }

    /** Panne d'Expo : on réessaie plus tard, jusqu'au nombre maximal de tentatives. */
    private function reporter(EnvoiNotification $envoi, string $erreur): EnvoiNotification
    {
        $tentatives = $envoi->tentatives + 1;
        $abandon = $tentatives >= (int) config('sospharma.expo.tentatives_max', 5);
        $envoi->forceFill([
            'statut' => $abandon ? EnvoiNotification::ECHEC : EnvoiNotification::EN_ATTENTE,
            'tentatives' => $tentatives,
            'programme_le' => CarbonImmutable::now('UTC')->addMinutes((int) config('sospharma.expo.reessai_minutes', 15)),
            'derniere_erreur' => $erreur,
        ])->save();

        Log::error($abandon ? 'Notification de garde abandonnée' : 'Notification de garde reportée', [
            'envoi' => $envoi->id_public,
            'tentatives' => $tentatives,
            'erreur' => $erreur,
        ]);

        return $envoi;
    }

    /**
     * « Nouveau tour de garde : 6 pharmacies de garde près de Cocody cette semaine »
     *
     * @param  array<int, int>  $parZone
     * @param  array<int, string>  $nomsZones
     */
    public function texte(?int $zoneId, array $parZone, array $nomsZones, string $nomVille, int $total): string
    {
        if ($zoneId !== null && ($parZone[$zoneId] ?? 0) > 0 && isset($nomsZones[$zoneId])) {
            $n = $parZone[$zoneId];

            return "{$n} pharmacie".($n > 1 ? 's' : '')." de garde près de {$nomsZones[$zoneId]} cette semaine.";
        }

        return "{$total} pharmacie".($total > 1 ? 's' : '')." de garde à {$nomVille} cette semaine.";
    }
}
