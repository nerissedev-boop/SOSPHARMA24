<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Http\Resources;

use App\Commun\Contrats\AnnuaireTerritoire;
use App\Commun\Contrats\RattachementsCompte;
use App\Commun\Securite\Role;
use App\Commun\Support\Dates;
use App\Modules\Comptes\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class CompteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $ville = $this->ville_id !== null ? app(AnnuaireTerritoire::class)->resumeVille($this->ville_id) : null;
        $pharmacies = $this->role === Role::Pharmacien && app()->bound(RattachementsCompte::class)
            ? app(RattachementsCompte::class)->pharmaciesDuCompte($this->id)
            : [];

        return [
            'id' => $this->id_public,
            'nom' => $this->nom,
            'email' => $this->email,
            'role' => $this->role->value,
            'ville' => $ville,
            // Villes où le compte peut agir (agent terrain : ses villes rattachées).
            'villes' => $this->role === Role::AgentTerrain
                ? array_values(array_filter(array_map(fn (int $id): ?array => app(AnnuaireTerritoire::class)->resumeVille($id), $this->villesRattachees())))
                : ($ville !== null ? [$ville] : []),
            'pharmacies' => $pharmacies,
            'actif' => $this->actif,
            'derniere_connexion_le' => Dates::iso($this->derniere_connexion_le),
            'cree_le' => Dates::iso($this->created_at),
        ];
    }
}
