<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Contrats\FichePharmacie;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Pharmacie connue près d'un relevé (« C'est la même » ou « Nouvelle pharmacie »).
 *
 * @property array{fiche: FichePharmacie, distance_m: int} $resource
 */
class DoublonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $fiche = $this->resource['fiche'];

        return [
            'id' => $fiche->idPublic,
            'nom' => $fiche->nom,
            'adresse' => $fiche->adresse,
            'quartier' => $fiche->quartier,
            'zone' => $fiche->zoneNom,
            'telephone' => $fiche->telephone,
            'position' => ['lat' => $fiche->latitude, 'lng' => $fiche->longitude],
            'distance_m' => $this->resource['distance_m'],
            'photo_facade' => $fiche->photoFacadeUrl,
            'verifiee_le' => Dates::iso($fiche->verifieeLe),
            'actif' => $fiche->actif,
        ];
    }
}
