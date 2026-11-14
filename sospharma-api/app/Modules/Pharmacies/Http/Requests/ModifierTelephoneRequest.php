<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/**
 * PATCH …/pharmacies/{id}/telephones/{tl} : { "whatsapp": true|false } et / ou { "principal": true }.
 * « principal: false » n'a pas de sens : on change de principal en choisissant un autre numéro.
 */
class ModifierTelephoneRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'whatsapp' => ['required_without:principal', 'boolean'],
            // « accepted » est une règle implicite : sans « sometimes », elle exigerait le champ.
            'principal' => ['sometimes', 'boolean', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'whatsapp.required_without' => 'Indiquez si ce numéro a WhatsApp, ou s\'il devient le numéro principal.',
            'principal.accepted' => 'Pour changer de numéro principal, choisissez l\'autre numéro comme principal.',
        ];
    }

    public function whatsapp(): ?bool
    {
        return $this->has('whatsapp') ? $this->boolean('whatsapp') : null;
    }

    public function principal(): bool
    {
        return $this->boolean('principal');
    }
}
