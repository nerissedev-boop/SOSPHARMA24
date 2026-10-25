<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Resources;

use App\Modules\Pharmacies\Models\Horaire;
use Illuminate\Http\Request;

/** Fiche complète d'une pharmacie (app). */
class PharmacieFicheResource extends PharmacieListeResource
{
    public function toArray(Request $request): array
    {
        $p = $this->resource->pharmacie;
        $p->loadMissing(['ville.pays', 'horaires']);

        return parent::toArray($request) + [
            'ville' => ['id' => $p->ville->id_public, 'nom' => $p->ville->nom],
            'indicatif' => $p->ville->pays->indicatif,
            'fuseau' => $p->ville->pays->fuseau,
            'horaires' => $p->horaires->map(fn (Horaire $h): array => $h->enPlage())->values()->all(),
            'services' => $p->services ?? [],
        ];
    }
}
