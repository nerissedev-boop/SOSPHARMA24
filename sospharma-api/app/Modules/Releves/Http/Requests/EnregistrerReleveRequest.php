<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/**
 * POST /agent/releves (création) et PATCH /agent/releves/{id} (correction d'un relevé « à corriger »).
 *
 * champs : nom, adresse (repère accepté : « face au marché »), quartier, telephone, whatsapp (E.164), h24,
 * services, horaires [{jour, ouverture, fermeture}], assurances [{id: as_…, tiers_payant}],
 * assurances_proposees [noms libres d'assurances absentes du référentiel].
 */
class EnregistrerReleveRequest extends RequeteApi
{
    public const PRECISION_MAX_M = 30;

    private const TELEPHONE = 'regex:/^\+\d{8,15}$/';

    public function rules(): array
    {
        $creation = $this->isMethod('post');
        $requis = $creation ? 'required' : 'sometimes';

        return [
            // Identifiant généré par le téléphone (UUID) : un renvoi ne crée pas de doublon.
            'identifiant' => [$creation ? 'required' : 'prohibited', 'string', 'min:8', 'max:64', 'regex:/^[A-Za-z0-9\-_]+$/'],
            // Mise à jour d'une pharmacie existante ; absent : nouvelle pharmacie.
            'pharmacie' => [$creation ? 'sometimes' : 'prohibited', 'nullable', 'string', 'regex:/^ph_[a-z0-9]+$/'],
            // Seulement si la position n'est dans aucune commune connue.
            'ville' => ['sometimes', 'nullable', 'string', 'regex:/^vi_[a-z0-9_]+$/'],
            'latitude' => [$requis, 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => [$requis, 'required_with:latitude', 'numeric', 'between:-180,180'],
            'precision_m' => [$requis, 'numeric', 'min:0', 'max:'.self::PRECISION_MAX_M],
            'ajustement_m' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000'],
            'releve_le' => [$requis, 'date'],

            'champs' => [$creation ? 'required' : 'sometimes', 'array'],
            'champs.nom' => ['sometimes', 'string', 'min:2', 'max:150'],
            'champs.adresse' => ['sometimes', 'string', 'min:2', 'max:255'],
            'champs.quartier' => ['sometimes', 'nullable', 'string', 'max:100'],
            'champs.telephone' => ['sometimes', 'nullable', 'string', self::TELEPHONE],
            'champs.whatsapp' => ['sometimes', 'nullable', 'string', self::TELEPHONE],
            'champs.h24' => ['sometimes', 'boolean'],
            'champs.services' => ['sometimes', 'array', 'max:30'],
            'champs.services.*' => ['string', 'max:80'],
            'champs.horaires' => ['sometimes', 'array', 'max:28'],
            'champs.horaires.*.jour' => ['required', 'integer', 'between:0,6'],
            'champs.horaires.*.ouverture' => ['required', 'date_format:H:i'],
            'champs.horaires.*.fermeture' => ['required', 'date_format:H:i'],
            'champs.assurances' => ['sometimes', 'array', 'max:50'],
            'champs.assurances.*.id' => ['required', 'string', 'distinct', 'regex:/^as_[a-z0-9_]+$/'],
            'champs.assurances.*.tiers_payant' => ['sometimes', 'boolean'],
            'champs.assurances_proposees' => ['sometimes', 'array', 'max:10'],
            'champs.assurances_proposees.*' => ['string', 'min:2', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'precision_m.max' => 'Position trop imprécise (plus de '.self::PRECISION_MAX_M.' m) : attendez un meilleur signal GPS.',
            'champs.telephone.regex' => 'Le téléphone doit être au format international, par exemple +2250102030405.',
            'champs.whatsapp.regex' => 'Le numéro WhatsApp doit être au format international, par exemple +2250102030405.',
        ];
    }
}
