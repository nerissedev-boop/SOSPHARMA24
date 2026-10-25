<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Http\Resources\PharmacieAdminResource;
use App\Modules\Signalements\Models\Signalement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Signalement */
class SignalementResource extends JsonResource
{
    private bool $ficheComplete = false;

    public function avecFicheComplete(): static
    {
        $this->ficheComplete = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $pharmacie = $this->relationLoaded('pharmacie') ? $this->pharmacie : null;

        return [
            'id' => $this->id_public,
            'pharmacie' => $pharmacie === null ? null : ($this->ficheComplete
                ? (new PharmacieAdminResource($pharmacie))->resolve($request)
                : ['id' => $pharmacie->id_public, 'nom' => $pharmacie->nom]),
            'motif' => $this->motif->value,
            'motif_libelle' => $this->motif->libelle(),
            'precisions' => $this->precisions,
            'statut' => $this->statut->value,
            'commentaire' => $this->commentaire,
            'traite_par' => $this->relationLoaded('traitePar') && $this->traitePar !== null
                ? ['id' => $this->traitePar->id_public, 'nom' => $this->traitePar->nom] : null,
            'traite_le' => Dates::iso($this->traite_le),
            'cree_le' => Dates::iso($this->created_at),
        ];
    }
}
