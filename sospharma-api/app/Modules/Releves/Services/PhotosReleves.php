<?php

declare(strict_types=1);

namespace App\Modules\Releves\Services;

use App\Commun\Erreurs\ServiceExterneIndisponible;
use App\Commun\Fichiers\ImageSansMetadonnees;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypePhoto;
use App\Modules\Releves\Exceptions\PhotoIntrouvable;
use App\Modules\Releves\Exceptions\ReleveNonModifiable;
use App\Modules\Releves\Models\PhotoReleve;
use App\Modules\Releves\Models\Releve;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Photos des relevés : privées dans storage/app/private/releves (disque « local »), métadonnées retirées,
 * une par type (un nouvel envoi remplace la précédente). À la validation, la façade est copiée sur le disque « public ».
 */
final class PhotosReleves
{
    public const DISQUE_PRIVE = 'local';

    public const DOSSIER_PRIVE = 'releves';

    public const DISQUE_PUBLIC = 'public';

    public const DOSSIER_PUBLIC = 'pharmacies/facades';

    public function enregistrer(Releve $releve, TypePhoto $type, UploadedFile $fichier): PhotoReleve
    {
        if (! in_array($releve->statut, [StatutReleve::Envoye, StatutReleve::ACorriger], true)) {
            throw new ReleveNonModifiable('On ne peut plus ajouter de photo à ce relevé.');
        }

        $image = ImageSansMetadonnees::nettoyer((string) $fichier->getRealPath());
        $chemin = self::DOSSIER_PRIVE.'/'.$releve->id_public.'/'.$type->value.'-'.bin2hex(random_bytes(6)).'.'.$image->extension;
        $disque = Storage::disk(self::DISQUE_PRIVE);

        try {
            $ecrit = $disque->put($chemin, $image->contenu);
        } catch (Throwable $e) {
            Log::error('Photo de relevé non enregistrée', ['releve' => $releve->id_public, 'erreur' => $e->getMessage()]);

            throw new ServiceExterneIndisponible('La photo n\'a pas pu être enregistrée. Réessayez.', null, $e);
        }
        if ($ecrit === false) {
            Log::error('Photo de relevé non enregistrée (écriture refusée)', ['releve' => $releve->id_public]);

            throw new ServiceExterneIndisponible('La photo n\'a pas pu être enregistrée. Réessayez.');
        }

        try {
            [$photo, $ancienChemin] = DB::transaction(function () use ($releve, $type, $chemin, $image): array {
                $photo = PhotoReleve::query()->where('releve_id', $releve->id)->where('type', $type->value)->lockForUpdate()->first();
                $ancien = $photo?->chemin;
                $attributs = [
                    'chemin' => $chemin,
                    'mime' => $image->mime,
                    'taille_octets' => strlen($image->contenu),
                    'largeur' => $image->largeur,
                    'hauteur' => $image->hauteur,
                    'metadonnees_supprimees' => $image->metadonneesSupprimees,
                    'publiee' => false,
                    'chemin_public' => null,
                ];
                if ($photo === null) {
                    $photo = PhotoReleve::query()->create($attributs + ['releve_id' => $releve->id, 'type' => $type]);
                } else {
                    $photo->update($attributs);
                }

                return [$photo, $ancien];
            });
        } catch (Throwable $e) {
            // La base n'a pas suivi : on ne laisse pas de fichier orphelin.
            $this->supprimer(self::DISQUE_PRIVE, $chemin);

            throw $e;
        }

        if ($ancienChemin !== null && $ancienChemin !== $chemin) {
            $this->supprimer(self::DISQUE_PRIVE, $ancienChemin);
        }

        return $photo;
    }

    /**
     * Copie publique de la photo (façade validée).
     *
     * @return string chemin sur le disque public
     */
    public function publier(PhotoReleve $photo, string $idPublicPharmacie): string
    {
        $cible = self::DOSSIER_PUBLIC.'/'.$idPublicPharmacie.'-'.bin2hex(random_bytes(6)).'.'.pathinfo($photo->chemin, PATHINFO_EXTENSION);

        try {
            $contenu = Storage::disk(self::DISQUE_PRIVE)->get($photo->chemin);
            $ecrit = $contenu !== null && Storage::disk(self::DISQUE_PUBLIC)->put($cible, $contenu);
        } catch (Throwable $e) {
            Log::error('Publication de la photo de façade impossible', ['photo' => $photo->id_public, 'erreur' => $e->getMessage()]);

            throw new ServiceExterneIndisponible('La photo de façade n\'a pas pu être publiée. Réessayez.', null, $e);
        }
        if (! $ecrit) {
            Log::error('Publication de la photo de façade impossible (fichier absent ou écriture refusée)', ['photo' => $photo->id_public]);

            throw new ServiceExterneIndisponible('La photo de façade n\'a pas pu être publiée. Réessayez.');
        }

        return $cible;
    }

    /** @return array{chemin: string, type: string} pour servir le fichier privé à l'équipe */
    public function fichier(PhotoReleve $photo): array
    {
        try {
            $existe = Storage::disk(self::DISQUE_PRIVE)->exists($photo->chemin);
        } catch (Throwable $e) {
            Log::error('Lecture de photo de relevé impossible', ['photo' => $photo->id_public, 'erreur' => $e->getMessage()]);

            throw new ServiceExterneIndisponible('La photo n\'a pas pu être lue.', null, $e);
        }
        if (! $existe) {
            throw new PhotoIntrouvable('Le fichier de cette photo est introuvable.');
        }

        return ['chemin' => $photo->chemin, 'type' => $photo->mime];
    }

    public function supprimerPublic(string $chemin): void
    {
        $this->supprimer(self::DISQUE_PUBLIC, $chemin);
    }

    /** Suppression non bloquante : un échec est journalisé, le fichier reste à nettoyer. */
    private function supprimer(string $disque, string $chemin): void
    {
        try {
            Storage::disk($disque)->delete($chemin);
        } catch (Throwable $e) {
            Log::warning('Fichier non supprimé', ['disque' => $disque, 'chemin' => $chemin, 'erreur' => $e->getMessage()]);
        }
    }
}
