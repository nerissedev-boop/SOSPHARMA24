<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Releves\Models\Releve;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Relevé vu par l'agent qui l'a envoyé (suivi dans l'app). @mixin Releve */
class ReleveResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'identifiant' => $this->identifiant_client,
            'type' => $this->type->value,
            'statut' => $this->statut->value,
            'commentaire' => $this->commentaire,
            'ville' => $this->relationLoaded('ville') ? ['id' => $this->ville->id_public, 'nom' => $this->ville->nom] : null,
            'position' => ['lat' => $this->lat(), 'lng' => $this->lng()],
            'precision_m' => (float) $this->precision_m,
            'ajustement_m' => $this->ajustement_m,
            'champs' => $this->champs ?? [],
            'photos' => $this->relationLoaded('photos') ? PhotoReleveResource::collection($this->photos)->resolve($request) : [],
            'releve_le' => Dates::iso($this->releve_le),
            'recu_le' => Dates::iso($this->recu_le),
            'traite_le' => Dates::iso($this->traite_le),
        ];
    }
}
