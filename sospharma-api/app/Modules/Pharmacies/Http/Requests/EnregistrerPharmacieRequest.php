<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** Création (POST) ou modification partielle (PATCH) d'une fiche par l'équipe. */
class EnregistrerPharmacieRequest extends RequeteApi
{
    public const TELEPHONE = 'regex:/^\+\d{8,15}$/';

    public function rules(): array
    {
        $requis = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'nom' => [$requis, 'string', 'max:150'],
            'adresse' => [$requis, 'string', 'max:255'],
            'quartier' => ['sometimes', 'nullable', 'string', 'max:100'],
            'ville' => [$this->isMethod('post') ? 'required_without:zone' : 'sometimes', 'string', 'exists:villes,id_public'],
            'zone' => ['sometimes', 'nullable', 'string', 'exists:zones,id_public'],
            'telephone' => ['sometimes', 'nullable', 'string', self::TELEPHONE],
            'whatsapp' => ['sometimes', 'nullable', 'string', self::TELEPHONE],
            'latitude' => [$requis, 'numeric', 'between:-90,90'],
            'longitude' => [$requis, 'numeric', 'between:-180,180'],
            'h24' => ['sometimes', 'boolean'],
            'services' => ['sometimes', 'nullable', 'array', 'max:30'],
            'services.*' => ['string', 'max:80'],
            // Les assurances ont leur route : PUT …/assurances (table pharmacie_assurances).
            'assurances' => ['prohibited'],
            // Vrai : la fiche vient d'être vérifiée (met verifiee_le à maintenant).
            'verifiee' => ['sometimes', 'boolean'],
            'actif' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'assurances.prohibited' => 'Les assurances se modifient par la route dédiée PUT …/assurances.',
            'telephone.regex' => 'Le téléphone doit être au format international, par exemple +2250102030405.',
            'whatsapp.regex' => 'Le numéro WhatsApp doit être au format international, par exemple +2250102030405.',
        ];
    }
}
