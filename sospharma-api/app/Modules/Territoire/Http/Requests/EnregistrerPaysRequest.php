<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Territoire\Enums\StatutPays;
use Illuminate\Validation\Rule;

/** Création (POST) ou modification partielle (PATCH) d'un pays. */
class EnregistrerPaysRequest extends RequeteApi
{
    public function rules(): array
    {
        $creation = $this->isMethod('post');
        $requis = $creation ? 'required' : 'sometimes';

        return [
            'code' => [$creation ? 'required' : 'prohibited', 'string', 'size:2', 'regex:/^[A-Z]{2}$/', Rule::unique('pays', 'code')],
            'nom' => [$requis, 'string', 'max:100'],
            'indicatif' => [$requis, 'string', 'regex:/^\+\d{1,4}$/'],
            'fuseau' => [$requis, 'string', 'timezone:all'],
            'devise' => [$requis, 'string', 'size:3', 'regex:/^[A-Z]{3}$/'],
            'urgences' => [$requis, 'array', 'min:1'],
            'urgences.*.service' => ['required', 'string', 'max:50'],
            'urgences.*.libelle' => ['required', 'string', 'max:100'],
            'urgences.*.numero' => ['required', 'string', 'regex:/^\+?\d{2,15}$/'],
            'langues' => ['sometimes', 'nullable', 'array'],
            'langues.*' => ['string', 'size:2'],
            // Coordonnées du support (« Nous contacter ») ; vides = « bientôt disponible » dans l'app.
            'support_whatsapp' => ['sometimes', 'nullable', 'string', 'regex:/^\+\d{8,15}$/'],
            'support_telephone' => ['sometimes', 'nullable', 'string', 'regex:/^\+\d{8,15}$/'],
            'support_email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'statut' => [$requis, Rule::enum(StatutPays::class)],
            'actif' => ['sometimes', 'boolean'],
        ];
    }
}
