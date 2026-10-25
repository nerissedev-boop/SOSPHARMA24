<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/**
 * POST /propositions : un usager propose une pharmacie manquante, depuis la pharmacie elle-même.
 * latitude/longitude = le repère (éventuellement ajusté à la main) ; gps_latitude/gps_longitude = la position
 * du téléphone au moment de l'envoi. Les deux doivent être à 100 m au plus l'un de l'autre.
 */
class EnvoyerPropositionRequest extends RequeteApi
{
    public const PRECISION_MAX_M = 30;

    public function rules(): array
    {
        return [
            // Identifiant généré par le téléphone (UUID) : un renvoi ne crée pas de doublon.
            'identifiant' => ['required', 'string', 'min:8', 'max:64', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'gps_latitude' => ['required', 'numeric', 'between:-90,90'],
            'gps_longitude' => ['required', 'numeric', 'between:-180,180'],
            'precision_m' => ['required', 'numeric', 'min:0', 'max:'.self::PRECISION_MAX_M],
            'releve_le' => ['required', 'date'],
            'nom' => ['required', 'string', 'min:2', 'max:150'],
            'telephone' => ['sometimes', 'nullable', 'string', 'regex:/^\+\d{8,15}$/'],
            // Pharmacies connues à 100 m que l'usager a vues et écartées (« Non, c'est une autre »).
            'doublons_ecartes' => ['sometimes', 'array', 'max:20'],
            'doublons_ecartes.*' => ['string', 'distinct', 'regex:/^ph_[a-z0-9]+$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'precision_m.max' => 'Position trop imprécise (plus de '.self::PRECISION_MAX_M.' m) : attendez quelques secondes à l\'extérieur.',
            'telephone.regex' => 'Le téléphone doit être au format international, par exemple +2250102030405.',
        ];
    }
}
