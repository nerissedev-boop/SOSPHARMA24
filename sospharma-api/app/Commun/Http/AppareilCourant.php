<?php

declare(strict_types=1);

namespace App\Commun\Http;

use Illuminate\Http\Request;

/**
 * L'appareil (téléphone sans compte) identifié par l'en-tête X-Device-Token.
 * Le middleware du module Notifications le résout et le dépose dans les attributs de la requête :
 * les autres modules le lisent ici sans dépendre de Notifications.
 */
final class AppareilCourant
{
    public const ENTETE = 'X-Device-Token';

    public const ATTRIBUT = 'appareil_id';

    public static function id(Request $request): ?int
    {
        $id = $request->attributes->get(self::ATTRIBUT);

        return is_int($id) ? $id : null;
    }

    /** Clé stable pour les limiteurs de débit : l'appareil s'il est connu, sinon l'adresse IP. */
    public static function cleLimiteur(Request $request): string
    {
        $jeton = (string) $request->headers->get(self::ENTETE, '');

        return $jeton !== '' ? 'appareil:'.hash('sha256', $jeton) : 'ip:'.$request->ip();
    }
}
