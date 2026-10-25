<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Models\PropositionAssurance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PropositionAssurance */
class PropositionAssuranceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'nom' => $this->nom,
            'pays' => $this->relationLoaded('pays') ? $this->pays->code : null,
            'pharmacie' => $this->relationLoaded('pharmacie') && $this->pharmacie !== null
                ? ['id' => $this->pharmacie->id_public, 'nom' => $this->pharmacie->nom] : null,
            'source' => $this->source->value,
            'statut' => $this->statut->value,
            'assurance' => $this->relationLoaded('assurance') && $this->assurance !== null
                ? ['id' => $this->assurance->id_public, 'nom' => $this->assurance->nom] : null,
            'propose_par' => $this->relationLoaded('proposePar') && $this->proposePar !== null
                ? ['id' => $this->proposePar->id_public, 'nom' => $this->proposePar->nom] : null,
            'commentaire' => $this->commentaire,
            'traite_par' => $this->relationLoaded('traitePar') && $this->traitePar !== null
                ? ['id' => $this->traitePar->id_public, 'nom' => $this->traitePar->nom] : null,
            'traite_le' => Dates::iso($this->traite_le),
            'cree_le' => Dates::iso($this->created_at),
        ];
    }
}
