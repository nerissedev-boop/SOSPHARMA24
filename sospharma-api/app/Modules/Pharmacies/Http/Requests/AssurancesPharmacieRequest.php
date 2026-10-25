<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/**
 * PUT …/assurances : remplace toutes les assurances d'une pharmacie.
 * « propositions » (noms libres d'assurances absentes du référentiel) n'est accepté que dans l'espace pharmacien.
 */
class AssurancesPharmacieRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'assurances' => ['present', 'array', 'max:50'],
            'assurances.*.id' => ['required', 'string', 'distinct', 'regex:/^as_[a-z0-9_]+$/'],
            'assurances.*.tiers_payant' => ['sometimes', 'boolean'],
            'assurances.*.remarque' => ['sometimes', 'nullable', 'string', 'max:255'],
            'propositions' => [$this->is('api/v1/pharmacien/*') ? 'sometimes' : 'prohibited', 'array', 'max:10'],
            'propositions.*' => ['string', 'min:2', 'max:150'],
        ];
    }

    /** @return list<array{id: string, tiers_payant?: bool, remarque?: string|null}> */
    public function lignes(): array
    {
        return array_values((array) $this->validated('assurances', []));
    }

    /** @return list<string> */
    public function propositions(): array
    {
        return array_values((array) $this->validated('propositions', []));
    }

    public function messages(): array
    {
        return ['propositions.prohibited' => 'Les propositions d\'assurances viennent des pharmaciens et des agents terrain.'];
    }
}
