<?php

declare(strict_types=1);

namespace App\Commun\Fichiers;

/** Résultat de ImageSansMetadonnees::nettoyer(). */
final class ImageNettoyee
{
    public function __construct(
        public readonly string $contenu,
        public readonly string $mime,
        public readonly string $extension,
        public readonly int $largeur,
        public readonly int $hauteur,
        /** Faux si aucune bibliothèque d'image n'était disponible : le fichier est gardé tel quel. */
        public readonly bool $metadonneesSupprimees,
    ) {}
}
