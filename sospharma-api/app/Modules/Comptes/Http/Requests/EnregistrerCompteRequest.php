<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Commun\Securite\Role;
use App\Modules\Comptes\Models\User;
use Illuminate\Validation\Rule;

/** Invitation (POST) ou modification (PATCH) d'un compte par un admin. */
class EnregistrerCompteRequest extends RequeteApi
{
    public function rules(): array
    {
        $creation = $this->isMethod('post');
        $compte = $this->route('compte');

        return [
            'nom' => [$creation ? 'required' : 'sometimes', 'string', 'max:150'],
            'email' => [$creation ? 'required' : 'sometimes', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($compte instanceof User ? $compte->id : null)],
            'role' => [$creation ? 'required' : 'sometimes', Rule::enum(Role::class)],
            // Obligatoire pour un éditeur de ville ; ignorée pour les autres rôles.
            'ville' => ['nullable', 'string', 'required_if:role,editeur_ville'],
            // Agent terrain : une ou plusieurs villes (identifiants publics) ; ignorées pour les autres rôles.
            'villes' => ['nullable', 'array', 'max:20', 'required_if:role,agent_terrain'],
            'villes.*' => ['string', 'distinct'],
            'actif' => ['sometimes', 'boolean'],
        ];
    }
}
