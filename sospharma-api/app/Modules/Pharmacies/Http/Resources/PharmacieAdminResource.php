<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Horaire;
use App\Modules\Pharmacies\Models\Pharmacie;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pharmacie */
class PharmacieAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'nom' => $this->nom,
            'adresse' => $this->adresse,
            'quartier' => $this->quartier,
            'ville' => $this->relationLoaded('ville') ? ['id' => $this->ville->id_public, 'nom' => $this->ville->nom] : null,
            'zone' => $this->relationLoaded('zone') && $this->zone !== null ? ['id' => $this->zone->id_public, 'nom' => $this->zone->nom] : null,
            'telephone' => $this->telephone,
            'whatsapp' => $this->whatsapp,
            'position' => ['lat' => $this->lat(), 'lng' => $this->lng()],
            'h24' => $this->h24,
            'services' => $this->services ?? [],
            'photo_facade' => $this->urlPhotoFacade(),
            'assurances' => $this->resource->assurances->map(fn (Assurance $a): array => [
                'id' => $a->id_public,
                'nom' => $a->nom,
                'slug' => $a->slug,
                'type' => $a->type->value,
                'actif' => $a->actif,
                'tiers_payant' => (bool) $a->pivot?->tiers_payant,
                'remarque' => $a->pivot?->remarque,
                'verifiee_le' => Dates::iso($a->pivot?->verifiee_le),
            ])->values()->all(),
            'horaires' => $this->relationLoaded('horaires') ? $this->horaires->map(fn (Horaire $h): array => $h->enPlage())->values()->all() : null,
            'verifiee_le' => Dates::iso($this->verifiee_le),
            'actif' => $this->actif,
            'cree_le' => Dates::iso($this->created_at),
            'modifie_le' => Dates::iso($this->updated_at),
        ];
    }
}
