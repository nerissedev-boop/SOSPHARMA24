<?php

declare(strict_types=1);

namespace App\Commun\Fichiers;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Erreurs\ServiceExterneIndisponible;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Supprime les métadonnées d'une image (EXIF, dont la position GPS, XMP, IPTC) en la réencodant,
 * avec GD ou, à défaut, Imagick : aucune dépendance Composer.
 * L'orientation EXIF est appliquée aux pixels avant le réencodage (sinon une photo prise en portrait
 * apparaîtrait couchée une fois l'EXIF retiré). Sans GD ni Imagick, l'image est gardée telle quelle
 * et l'événement est journalisé (metadonneesSupprimees = false).
 */
final class ImageSansMetadonnees
{
    public const QUALITE = 85;

    private const EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    public static function nettoyer(string $chemin): ImageNettoyee
    {
        $infos = @getimagesize($chemin);
        if ($infos === false || ! isset(self::EXTENSIONS[$infos['mime']])) {
            throw new DonneesInvalides('', ['photo' => ['Image JPEG, PNG ou WebP attendue.']]);
        }
        $mime = (string) $infos['mime'];

        $original = @file_get_contents($chemin);
        if ($original === false) {
            Log::error('Lecture d\'image impossible', ['chemin' => $chemin]);

            throw new ServiceExterneIndisponible('La photo n\'a pas pu être lue. Réessayez.');
        }

        if (function_exists('imagecreatefromstring')) {
            try {
                return self::avecGd($chemin, $original, $mime);
            } catch (Throwable $e) {
                Log::warning('Réencodage GD impossible, essai avec Imagick', ['erreur' => $e->getMessage()]);
            }
        }

        if (class_exists(\Imagick::class)) {
            try {
                return self::avecImagick($original, $mime);
            } catch (Throwable $e) {
                Log::warning('Réencodage Imagick impossible', ['erreur' => $e->getMessage()]);
            }
        }

        Log::warning('Métadonnées d\'image NON supprimées : ni GD ni Imagick utilisables sur ce serveur.');

        return new ImageNettoyee($original, $mime, self::EXTENSIONS[$mime], (int) $infos[0], (int) $infos[1], false);
    }

    private static function avecGd(string $chemin, string $original, string $mime): ImageNettoyee
    {
        $image = @imagecreatefromstring($original);
        if ($image === false) {
            throw new DonneesInvalides('', ['photo' => ['Cette image est illisible ou corrompue.']]);
        }

        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($chemin);
            $angle = match (is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1) {
                3 => 180,
                6 => 270, // 90° dans le sens horaire (imagerotate tourne dans le sens inverse)
                8 => 90,
                default => 0,
            };
            if ($angle !== 0) {
                $tournee = imagerotate($image, $angle, 0);
                if ($tournee !== false) {
                    $image = $tournee;
                }
            }
        }

        if ($mime === 'image/webp' && ! function_exists('imagewebp')) {
            $mime = 'image/jpeg';
        }

        ob_start();
        try {
            $ok = match ($mime) {
                'image/png' => imagesavealpha($image, true) && imagepng($image, null, 6),
                'image/webp' => imagewebp($image, null, self::QUALITE),
                default => imagejpeg($image, null, self::QUALITE),
            };
            $contenu = (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
        if (! $ok || $contenu === '') {
            throw new ServiceExterneIndisponible('Réencodage de l\'image impossible.');
        }

        return new ImageNettoyee($contenu, $mime, self::EXTENSIONS[$mime], imagesx($image), imagesy($image), true);
    }

    private static function avecImagick(string $original, string $mime): ImageNettoyee
    {
        $image = new \Imagick;
        $image->readImageBlob($original);
        if (method_exists($image, 'autoOrient')) {
            $image->autoOrient();
        }
        $image->stripImage();
        if ($mime !== 'image/png') {
            $image->setImageCompressionQuality(self::QUALITE);
        }
        $contenu = $image->getImageBlob();

        return new ImageNettoyee($contenu, $mime, self::EXTENSIONS[$mime], $image->getImageWidth(), $image->getImageHeight(), true);
    }
}
