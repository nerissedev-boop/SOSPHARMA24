<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\PositionRequest;
use App\Http\Controllers\Controller;
use App\Modules\Territoire\Contrats\CompteurZones;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Exceptions\PaysIntrouvable;
use App\Modules\Territoire\Exceptions\VilleIntrouvable;
use App\Modules\Territoire\Http\Requests\RechercheZonesRequest;
use App\Modules\Territoire\Http\Resources\PaysResource;
use App\Modules\Territoire\Http\Resources\PositionResource;
use App\Modules\Territoire\Http\Resources\VilleResource;
use App\Modules\Territoire\Http\Resources\ZoneResource;
use App\Modules\Territoire\Models\Pays;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use App\Modules\Territoire\Services\ConfigurationPays;
use App\Modules\Territoire\Services\ZoneDepuisPosition;
use Illuminate\Http\JsonResponse;

/** Routes publiques du territoire (petites listes : aucune pagination). */
class TerritoireController extends Controller
{
    public function pays(ConfigurationPays $configuration): JsonResponse
    {
        return ApiResponse::ok(PaysResource::collection($configuration->paysActifs()));
    }

    public function villes(Pays $pays): JsonResponse
    {
        if (! $pays->actif) {
            throw new PaysIntrouvable;
        }

        $villes = $pays->villes()->where('actif', true)
            ->withCount(['zones as nombre_communes' => fn ($q) => $q->where('type', TypeZone::Commune)])
            ->orderBy('nom')->get()->each->setRelation('pays', $pays);

        return ApiResponse::ok(VilleResource::collection($villes));
    }

    public function zones(Ville $ville, RechercheZonesRequest $request, CompteurZones $compteurs): JsonResponse
    {
        if (! $ville->actif) {
            throw new VilleIntrouvable;
        }

        $q = $request->validated('q');
        $zones = Zone::query()
            ->where('ville_id', $ville->id)
            ->where('actif', true)
            ->when($q !== null, fn ($r) => $r->where('nom', 'like', '%'.addcslashes((string) $q, '%_\\').'%'))
            ->orderBy('type')
            ->orderBy('nom')
            ->get(['id', 'id_public', 'ville_id', 'nom', 'type', 'centre_lat', 'centre_lng'])
            ->each->setRelation('ville', $ville);

        $parZone = $compteurs->compter($zones->pluck('id')->all());

        return ApiResponse::ok($zones->map(
            fn (Zone $zone) => (new ZoneResource($zone))->avecCompteurs($parZone[$zone->id] ?? ['pharmacies' => 0, 'gardes' => 0])
        )->values());
    }

    public function depuisPosition(PositionRequest $request, ZoneDepuisPosition $detection): JsonResponse
    {
        return ApiResponse::ok(new PositionResource($detection->trouver($request->latitude(), $request->longitude())));
    }
}
