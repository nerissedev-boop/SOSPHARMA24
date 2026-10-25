<?php

declare(strict_types=1);

namespace App\Modules\Support\Services;

use App\Commun\Erreurs\ActionInterdite;
use App\Commun\Erreurs\ServiceExterneIndisponible;
use App\Commun\Securite\CompteAvecRole;
use App\Modules\Support\Enums\StatutMessage;
use App\Modules\Support\Enums\SujetMessage;
use App\Modules\Support\Exceptions\MessageIntrouvable;
use App\Modules\Support\Models\MessageSupport;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/** « Nous contacter » : messages et captures d'écran, stockées hors du dossier public. */
final class MessagesSupport
{
    public const DISQUE = 'local'; // storage/app/private

    public const DOSSIER = 'support/captures';

    public function recevoir(SujetMessage $sujet, string $message, ?string $contact, ?int $appareilId): MessageSupport
    {
        return MessageSupport::query()->create([
            'sujet' => $sujet,
            'message' => $message,
            'contact' => $contact,
            'appareil_id' => $appareilId,
            'statut' => StatutMessage::Nouveau,
        ]);
    }

    public function joindreCapture(MessageSupport $message, UploadedFile $fichier, ?int $appareilId): MessageSupport
    {
        if ($appareilId === null || $message->appareil_id !== $appareilId) {
            throw new ActionInterdite('Seul l\'appareil qui a envoyé le message peut y joindre une capture.');
        }

        $disque = Storage::disk(self::DISQUE);
        $nom = $message->id_public.'-'.bin2hex(random_bytes(4)).'.'.($fichier->guessExtension() ?? 'jpg');
        try {
            $chemin = $disque->putFileAs(self::DOSSIER, $fichier, $nom);
        } catch (Throwable $e) {
            Log::error('Capture non enregistrée', ['message' => $message->id_public, 'erreur' => $e->getMessage()]);

            throw new ServiceExterneIndisponible('La capture n\'a pas pu être enregistrée. Réessayez.', null, $e);
        }
        if ($chemin === false) {
            Log::error('Capture non enregistrée (écriture refusée)', ['message' => $message->id_public]);

            throw new ServiceExterneIndisponible('La capture n\'a pas pu être enregistrée. Réessayez.');
        }

        $ancienne = $message->capture_chemin;
        $message->update(['capture_chemin' => $chemin, 'capture_type' => $fichier->getMimeType()]);

        if ($ancienne !== null) {
            try {
                $disque->delete($ancienne);
            } catch (Throwable $e) {
                // Non bloquant : la nouvelle capture est enregistrée, l'ancienne reste à nettoyer.
                Log::warning('Ancienne capture non supprimée', ['chemin' => $ancienne, 'erreur' => $e->getMessage()]);
            }
        }

        return $message;
    }

    /** @return array{chemin: string, type: string|null} */
    public function capture(MessageSupport $message): array
    {
        try {
            $existe = $message->capture_chemin !== null && Storage::disk(self::DISQUE)->exists($message->capture_chemin);
        } catch (Throwable $e) {
            Log::error('Lecture de capture impossible', ['message' => $message->id_public, 'erreur' => $e->getMessage()]);

            throw new ServiceExterneIndisponible('La capture n\'a pas pu être lue.', null, $e);
        }
        if (! $existe) {
            throw new MessageIntrouvable('Ce message n\'a pas de capture.');
        }

        return ['chemin' => (string) $message->capture_chemin, 'type' => $message->capture_type];
    }

    public function traiter(MessageSupport $message, CompteAvecRole $auteur): MessageSupport
    {
        if ($message->statut === StatutMessage::Nouveau) {
            $message->update(['statut' => StatutMessage::Traite, 'traite_par' => $auteur->idInterne(), 'traite_le' => now()]);
        }

        return $message;
    }
}
