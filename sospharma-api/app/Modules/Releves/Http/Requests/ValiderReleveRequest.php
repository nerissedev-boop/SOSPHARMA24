<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Requests;

/**
 * POST /admin/releves/{id}/valider : « corrections » facultatives, au format des champs proposés,
 * appliquées par l'équipe avant la création ou la mise à jour de la fiche.
 * « fusionner_avec » (ph_…) : le relevé devient une mise à jour de cette pharmacie (doublon d'une proposition).
 */
class ValiderReleveRequest extends EnregistrerReleveRequest
{
    public function rules(): array
    {
        $regles = [];
        foreach (parent::rules() as $cle => $regle) {
            if (str_starts_with($cle, 'champs.')) {
                $regles['corrections.'.substr($cle, 7)] = $regle;
            }
        }

        return [
            'corrections' => ['sometimes', 'array'],
            'fusionner_avec' => ['sometimes', 'nullable', 'string', 'regex:/^ph_[a-z0-9]+$/'],
        ] + $regles;
    }

    public function messages(): array
    {
        return [];
    }
}
