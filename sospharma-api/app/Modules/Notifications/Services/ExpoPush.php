<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Services;

use App\Commun\Erreurs\ServiceExterneIndisponible;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client du service Expo Push : une simple requête HTTP, pas de SDK serveur.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
final class ExpoPush
{
    public const ERREUR_APPAREIL_INCONNU = 'DeviceNotRegistered';

    public static function estJetonExpo(string $jeton): bool
    {
        return preg_match('/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_\-]+\]$/', $jeton) === 1;
    }

    /**
     * Envoie un lot (100 messages au plus) et renvoie un ticket par message, dans le même ordre.
     *
     * @param  list<array{to: string, title: string, body: string, data?: array<string, mixed>, sound?: string}>  $messages
     * @return list<array{status: string, id?: string, message?: string, details?: array<string, mixed>}>
     *
     * @throws ServiceExterneIndisponible si Expo ne répond pas ou refuse le lot entier
     */
    public function envoyer(array $messages): array
    {
        if ($messages === []) {
            return [];
        }
        if (count($messages) > (int) config('sospharma.expo.taille_lot', 100)) {
            throw new \InvalidArgumentException('Un lot Expo Push compte 100 messages au plus.');
        }

        try {
            $requete = Http::acceptJson()
                ->asJson()
                ->timeout((int) config('sospharma.expo.delai_secondes', 15))
                ->withHeaders(['Accept-Encoding' => 'gzip, deflate']);
            $jeton = config('sospharma.expo.access_token');
            if (is_string($jeton) && $jeton !== '') {
                $requete = $requete->withToken($jeton);
            }
            $reponse = $requete->post((string) config('sospharma.expo.url'), $messages)->throw();
        } catch (ConnectionException|RequestException $e) {
            Log::warning('Expo Push indisponible', ['erreur' => $e->getMessage(), 'messages' => count($messages)]);

            throw new ServiceExterneIndisponible('Le service de notification n\'a pas répondu.', null, $e);
        }

        $tickets = $reponse->json('data');
        if (! is_array($tickets) || count($tickets) !== count($messages)) {
            Log::warning('Réponse Expo Push inattendue', ['corps' => mb_substr($reponse->body(), 0, 500)]);

            throw new ServiceExterneIndisponible('Réponse inattendue du service de notification.');
        }

        return array_values($tickets);
    }
}
