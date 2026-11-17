<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\ServiceExterneIndisponible;
use App\Commun\Fichiers\ImageSansMetadonnees;
use App\Commun\Securite\CompteAvecRole;
use App\Modules\Pharmacies\Models\Pharmacie;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Photo de façade posée par l'équipe depuis le back-office, sans passer par un relevé terrain.
 * Même dossier public que les façades des relevés validés ; métadonnées (dont la position GPS) retirées.
 * Une nouvelle photo remplace la précédente, dont le fichier est supprimé.
 */
final class PhotosFacades
{
    public const DISQUE = 'public';

    public const DOSSIER = 'pharmacies/facades';

    public function remplacer(Pharmacie $pharmacie, UploadedFile $fichier, CompteAvecRole $par): Pharmacie
    {
        $image = ImageSansMetadonnees::nettoyer((string) $fichier->getRealPath());
        $chemin = self::DOSSIER.'/'.$pharmacie->id_public.'-'.bin2hex(random_bytes(6)).'.'.$image->extension;

        try {
            $ecrit = Storage::disk(self::DISQUE)->put($chemin, $image->contenu);
        } catch (Throwable $e) {
            Log::error('Photo de façade non enregistrée', ['pharmacie' => $pharmacie->id_public, 'erreur' => $e->getMessage()]);

            throw new ServiceExterneIndisponible('La photo n\'a pas pu être enregistrée. Réessayez.', null, $e);
        }
        if ($ecrit === false) {
            Log::error('Photo de façade non enregistrée (écriture refusée)', ['pharmacie' => $pharmacie->id_public]);

            throw new ServiceExterneIndisponible('La photo n\'a pas pu être enregistrée. Réessayez.');
        }

        try {
            $ancienne = DB::transaction(function () use ($pharmacie, $chemin): ?string {
                $verrouillee = Pharmacie::query()->whereKey($pharmacie->id)->lockForUpdate()->firstOrFail();
                $ancienne = $verrouillee->photo_facade;
                $verrouillee->update(['photo_facade' => $chemin]);

                return $ancienne;
            });
        } catch (Throwable $e) {
            // La base n'a pas suivi : pas de fichier orphelin.
            $this->supprimer($chemin);

            throw $e;
        }

        if ($ancienne !== null && $ancienne !== $chemin) {
            $this->supprimer($ancienne);
        }
        Log::info('Photo de façade posée depuis le back-office', [
            'pharmacie' => $pharmacie->id_public, 'compte_id' => $par->idInterne(),
            'largeur' => $image->largeur, 'hauteur' => $image->hauteur, 'metadonnees_supprimees' => $image->metadonneesSupprimees,
        ]);

        return $pharmacie->refresh();
    }

    public function retirer(Pharmacie $pharmacie, CompteAvecRole $par): Pharmacie
    {
        $ancienne = DB::transaction(function () use ($pharmacie): ?string {
            $verrouillee = Pharmacie::query()->whereKey($pharmacie->id)->lockForUpdate()->firstOrFail();
            $ancienne = $verrouillee->photo_facade;
            $verrouillee->update(['photo_facade' => null]);

            return $ancienne;
        });

        if ($ancienne !== null) {
            $this->supprimer($ancienne);
            Log::info('Photo de façade retirée depuis le back-office', ['pharmacie' => $pharmacie->id_public, 'compte_id' => $par->idInterne()]);
        }

        return $pharmacie->refresh();
    }

    /** Suppression non bloquante : un échec est journalisé, le fichier reste à nettoyer. */
    private function supprimer(string $chemin): void
    {
        try {
            Storage::disk(self::DISQUE)->delete($chemin);
        } catch (Throwable $e) {
            Log::warning('Fichier de façade non supprimé', ['chemin' => $chemin, 'erreur' => $e->getMessage()]);
        }
    }
}
