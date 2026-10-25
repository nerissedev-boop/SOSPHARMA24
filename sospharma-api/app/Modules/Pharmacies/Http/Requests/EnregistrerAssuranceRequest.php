<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use Illuminate\Validation\Rule;

/** Création (POST) ou modification partielle (PATCH) d'une assurance du référentiel. */
class EnregistrerAssuranceRequest extends RequeteApi
{
    public function rules(): array
    {
        $creation = $this->isMethod('post');

        return [
            'pays' => [$creation ? 'required' : 'prohibited', 'string', 'size:2', 'exists:pays,code'],
            'nom' => [$creation ? 'required' : 'sometimes', 'string', 'min:2', 'max:150'],
            // Déduit du nom s'il est absent (« MUGEF-CI » → « mugef-ci »).
            'slug' => ['sometimes', 'nullable', 'string', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'type' => [$creation ? 'required' : 'sometimes', Rule::enum(TypeAssurance::class)],
            'logo' => ['sometimes', 'nullable', 'string', 'max:255'],
            'actif' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'Le slug ne contient que des minuscules, des chiffres et des tirets (ex. mugef-ci).',
            'pays.prohibited' => 'Le pays d\'une assurance ne change pas : créez-en une autre.',
        ];
    }
}
