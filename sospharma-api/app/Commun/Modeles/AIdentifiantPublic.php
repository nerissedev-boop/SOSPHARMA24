<?php

declare(strict_types=1);

namespace App\Commun\Modeles;

use Illuminate\Support\Str;

/**
 * Identifiant public préfixé (« ph_k3x9m2q7ab ») exposé à la place de l'id interne.
 * Le modèle déclare : protected const PREFIXE_ID = 'ph';
 *
 * @mixin \Illuminate\Database\Eloquent\Model
 */
trait AIdentifiantPublic
{
    public static function bootAIdentifiantPublic(): void
    {
        static::creating(function (self $modele): void {
            if (empty($modele->id_public)) {
                $modele->id_public = static::genererIdPublic();
            }
        });
    }

    public static function genererIdPublic(): string
    {
        // 10 caractères minuscules/chiffres : non devinable, lisible au téléphone.
        return static::PREFIXE_ID.'_'.Str::lower(Str::random(10));
    }

    public function getRouteKeyName(): string
    {
        return 'id_public';
    }

    public static function trouverParIdPublic(string $idPublic): ?static
    {
        return static::query()->where('id_public', $idPublic)->first();
    }
}
