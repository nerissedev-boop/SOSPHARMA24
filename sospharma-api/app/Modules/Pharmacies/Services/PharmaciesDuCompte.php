<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Contrats\RattachementsCompte;
use App\Commun\Securite\CompteAvecRole;
use App\Modules\Pharmacies\Exceptions\AucunePharmacieRattachee;
use App\Modules\Pharmacies\Models\Pharmacie;

/** Lien pharmacien – pharmacie (table membres_pharmacie). */
final class PharmaciesDuCompte implements RattachementsCompte
{
    public function pharmaciesDuCompte(int $compteId): array
    {
        return Pharmacie::query()
            ->whereHas('membres', fn ($r) => $r->where('users.id', $compteId))
            ->orderBy('nom')
            ->get(['id', 'id_public', 'nom'])
            ->map(fn (Pharmacie $p): array => ['id' => $p->id_public, 'nom' => $p->nom])
            ->all();
    }

    /** Pharmacie gérée par le pharmacien connecté ; ?pharmacie=ph_… pour choisir s'il en gère plusieurs. */
    public function pharmacieCourante(CompteAvecRole $compte, ?string $idPublic = null): Pharmacie
    {
        $pharmacie = Pharmacie::query()
            ->whereHas('membres', fn ($r) => $r->where('users.id', $compte->idInterne()))
            ->when($idPublic !== null, fn ($r) => $r->where('id_public', $idPublic))
            ->orderBy('nom')
            ->first();

        return $pharmacie ?? throw new AucunePharmacieRattachee;
    }

    public function gere(CompteAvecRole $compte, int $pharmacieId): bool
    {
        return Pharmacie::query()->whereKey($pharmacieId)
            ->whereHas('membres', fn ($r) => $r->where('users.id', $compte->idInterne()))
            ->exists();
    }
}
