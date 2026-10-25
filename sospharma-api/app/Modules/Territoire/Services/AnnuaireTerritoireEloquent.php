<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Services;

use App\Commun\Contrats\AnnuaireTerritoire;
use App\Modules\Territoire\Models\Ville;

final class AnnuaireTerritoireEloquent implements AnnuaireTerritoire
{
    public function villeIdDepuisPublic(string $idPublic): ?int
    {
        $id = Ville::query()->where('id_public', $idPublic)->value('id');

        return $id !== null ? (int) $id : null;
    }

    public function resumeVille(int $villeId): ?array
    {
        $ville = Ville::query()->find($villeId, ['id', 'id_public', 'nom']);

        return $ville !== null ? ['id' => $ville->id_public, 'nom' => $ville->nom] : null;
    }
}
