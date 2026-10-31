<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Gardes\Services\ImportListeGarde;
use Illuminate\Validation\Rule;

/** Texte de la liste de garde officielle ; pour l'import, décisions par rang et période si l'en-tête n'en donne pas. */
class ListeGardeRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'texte' => ['required', 'string', 'max:200000'],
            'premier_jour' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'required_with:dernier_jour'],
            'dernier_jour' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:premier_jour'],
            'simulation' => ['sometimes', 'boolean'],
            'decisions' => ['sometimes', 'array'],
            'decisions.*.rang' => ['required', 'integer', 'min:0'],
            'decisions.*.action' => ['required', Rule::in(ImportListeGarde::ACTIONS)],
            'decisions.*.pharmacie' => ['sometimes', 'nullable', 'string'],
        ];
    }

    /** @return array<int, array{action: string, pharmacie?: string|null}> */
    public function decisions(): array
    {
        $decisions = [];
        foreach ((array) $this->validated('decisions', []) as $d) {
            $decisions[(int) $d['rang']] = ['action' => (string) $d['action'], 'pharmacie' => $d['pharmacie'] ?? null];
        }

        return $decisions;
    }
}
