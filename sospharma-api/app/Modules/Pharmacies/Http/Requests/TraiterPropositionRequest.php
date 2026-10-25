<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use Illuminate\Validation\Rule;

/**
 * Accepter : « assurance » (rattacher à une assurance existante) ou « type » (+ nom, slug facultatifs) pour la créer.
 * Rejeter : « raison » obligatoire.
 */
class TraiterPropositionRequest extends RequeteApi
{
    public function rules(): array
    {
        if (str_ends_with($this->path(), '/rejeter')) {
            return ['raison' => ['required', 'string', 'max:1000']];
        }

        return [
            'assurance' => ['nullable', 'string', 'regex:/^as_[a-z0-9_]+$/'],
            'type' => ['required_without:assurance', 'nullable', Rule::enum(TypeAssurance::class)],
            'nom' => ['sometimes', 'nullable', 'string', 'min:2', 'max:150'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'commentaire' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
