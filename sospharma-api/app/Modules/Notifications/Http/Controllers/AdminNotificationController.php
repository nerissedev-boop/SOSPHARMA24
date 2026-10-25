<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Controllers;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Erreurs\ServiceExterneIndisponible;
use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Http\Controllers\Controller;
use App\Modules\Notifications\Http\Requests\NotificationTestRequest;
use App\Modules\Notifications\Http\Resources\EnvoiNotificationResource;
use App\Modules\Notifications\Models\Appareil;
use App\Modules\Notifications\Models\EnvoiNotification;
use App\Modules\Notifications\Services\ExpoPush;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    /** Historique des envois, par curseur. */
    public function envois(Request $request): JsonResponse
    {
        $p = ParametresListe::depuis($request);
        $page = EnvoiNotification::query()->with('ville')->orderByDesc('id')->cursorPaginate($p->parPage);

        return ApiResponse::cursor($page, EnvoiNotificationResource::class);
    }

    /** Message d'essai vers un appareil donné (envoi immédiat, journalisé dans l'historique). */
    public function test(NotificationTestRequest $request, ExpoPush $expo): JsonResponse
    {
        $appareil = Appareil::query()->where('id_public', $request->validated('appareil'))->firstOrFail();
        if ($appareil->jeton_expo === null) {
            throw new DonneesInvalides('Cet appareil n\'a pas de jeton de notification.', ['appareil' => ['Notifications désactivées sur cet appareil.']]);
        }

        $titre = (string) $request->validated('titre', 'SOS Pharma 24');
        $envoi = EnvoiNotification::query()->create([
            'type' => 'test',
            'ville_id' => $appareil->ville_id,
            'reference' => $appareil->id_public,
            'titre' => $titre,
            'statut' => EnvoiNotification::EN_COURS,
            'programme_le' => now(),
            'tentatives' => 1,
        ]);

        try {
            $ticket = $expo->envoyer([[
                'to' => $appareil->jeton_expo,
                'title' => $titre,
                'body' => (string) $request->validated('message', 'Notification d\'essai.'),
                'data' => ['type' => 'test'],
            ]])[0];
        } catch (ServiceExterneIndisponible $e) {
            $envoi->update(['statut' => EnvoiNotification::ECHEC, 'echecs' => 1, 'derniere_erreur' => $e->getMessage()]);

            throw $e;
        }

        $ok = ($ticket['status'] ?? null) === 'ok';
        if (! $ok && ($ticket['details']['error'] ?? null) === ExpoPush::ERREUR_APPAREIL_INCONNU) {
            $appareil->update(['jeton_expo' => null]);
        }
        $envoi->update([
            'statut' => $ok ? EnvoiNotification::ENVOYE : EnvoiNotification::ECHEC,
            'envoye_le' => now(),
            'destinataires' => 1,
            'echecs' => $ok ? 0 : 1,
            'derniere_erreur' => $ok ? null : (string) ($ticket['message'] ?? 'Refusé par Expo.'),
        ]);

        return ApiResponse::ok(['envoi' => new EnvoiNotificationResource($envoi->load('ville')), 'ticket' => $ticket]);
    }
}
