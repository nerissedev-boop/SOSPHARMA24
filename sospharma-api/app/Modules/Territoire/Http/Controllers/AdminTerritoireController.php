<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Territoire\Enums\StatutVille;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Http\Requests\EnregistrerPaysRequest;
use App\Modules\Territoire\Http\Requests\EnregistrerVilleRequest;
use App\Modules\Territoire\Http\Requests\EnregistrerZoneRequest;
use App\Modules\Territoire\Http\Requests\ImporterZonesRequest;
use App\Modules\Territoire\Http\Resources\PaysResource;
use App\Modules\Territoire\Http\Resources\VilleResource;
use App\Modules\Territoire\Http\Resources\ZoneAdminResource;
use App\Modules\Territoire\Models\Pays;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use App\Modules\Territoire\Services\ImportZones;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** Back-office : pays, villes et zones. Pas de suppression réelle : DELETE désactive. */
class AdminTerritoireController extends Controller
{
    // ---- Pays (admin) ----

    public function listerPays(Request $request): JsonResponse
    {
        ParametresListe::depuis($request);

        return ApiResponse::ok(PaysResource::collection(Pays::query()->orderBy('nom')->get()));
    }

    public function creerPays(EnregistrerPaysRequest $request): JsonResponse
    {
        return ApiResponse::created(new PaysResource(Pays::query()->create($request->validated())));
    }

    public function modifierPays(EnregistrerPaysRequest $request, Pays $pays): JsonResponse
    {
        $pays->update($request->validated());

        return ApiResponse::ok(new PaysResource($pays));
    }

    public function desactiverPays(Pays $pays): JsonResponse
    {
        $pays->update(['actif' => false]);

        return ApiResponse::ok(new PaysResource($pays));
    }

    // ---- Villes (admin) ----

    public function listerVilles(Request $request): JsonResponse
    {
        $p = ParametresListe::depuis($request, ['pays', 'statut', 'actif'], ['nom' => 'nom'], triParDefaut: ['nom', 'asc']);
        $statut = $p->filtreParmi('statut', array_column(StatutVille::cases(), 'value'));

        $requete = Ville::query()->with('pays')
            ->when($p->filtre('pays') !== null, fn ($r) => $r->whereHas('pays', fn ($s) => $s->where('code', $p->filtre('pays'))))
            ->when($statut !== null, fn ($r) => $r->where('statut', $statut))
            ->when($p->filtreBooleen('actif') !== null, fn ($r) => $r->where('actif', $p->filtreBooleen('actif')));

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), VilleResource::class);
    }

    public function creerVille(EnregistrerVilleRequest $request): JsonResponse
    {
        $donnees = $request->validated();
        $donnees['pays_id'] = Pays::query()->where('code', $donnees['pays'])->value('id');
        unset($donnees['pays']);

        return ApiResponse::created(new VilleResource(Ville::query()->create($donnees)->load('pays')));
    }

    public function modifierVille(EnregistrerVilleRequest $request, Ville $ville): JsonResponse
    {
        $ville->update($request->validated());

        return ApiResponse::ok(new VilleResource($ville->load('pays')));
    }

    public function desactiverVille(Ville $ville): JsonResponse
    {
        $ville->update(['actif' => false]);

        return ApiResponse::ok(new VilleResource($ville->load('pays')));
    }

    // ---- Zones (équipe ; l'éditeur ne voit et ne modifie que sa ville) ----

    public function listerZones(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Zone::class);
        $p = ParametresListe::depuis($request, ['ville', 'type', 'actif'], ['nom' => 'nom'], true, ['nom', 'asc']);
        $type = $p->filtreParmi('type', array_column(TypeZone::cases(), 'value'));
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        $requete = Zone::query()->with('ville')
            ->when(! $compte->estAdmin(), fn ($r) => $r->where('ville_id', $compte->villeId()))
            ->when($p->filtre('ville') !== null, fn ($r) => $r->whereHas('ville', fn ($s) => $s->where('id_public', $p->filtre('ville'))))
            ->when($type !== null, fn ($r) => $r->where('type', $type))
            ->when($p->filtreBooleen('actif') !== null, fn ($r) => $r->where('actif', $p->filtreBooleen('actif')))
            ->when($p->q !== null, fn ($r) => $r->where('nom', 'like', '%'.addcslashes((string) $p->q, '%_\\').'%'));

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), ZoneAdminResource::class);
    }

    public function creerZone(EnregistrerZoneRequest $request): JsonResponse
    {
        $donnees = $request->validated();
        $ville = Ville::query()->where('id_public', $donnees['ville'])->firstOrFail();
        Gate::authorize('create', [Zone::class, $ville->id]);

        unset($donnees['ville']);
        $donnees['ville_id'] = $ville->id;
        $donnees['contour'] = is_string($donnees['contour']) ? json_decode($donnees['contour'], true) : $donnees['contour'];

        return ApiResponse::created(new ZoneAdminResource(Zone::query()->create($donnees)->load('ville')));
    }

    public function modifierZone(EnregistrerZoneRequest $request, Zone $zone): JsonResponse
    {
        Gate::authorize('update', $zone);
        $donnees = $request->validated();
        if (isset($donnees['contour']) && is_string($donnees['contour'])) {
            $donnees['contour'] = json_decode($donnees['contour'], true);
        }
        $zone->update($donnees);

        return ApiResponse::ok(new ZoneAdminResource($zone->load('ville')));
    }

    public function desactiverZone(Zone $zone): JsonResponse
    {
        Gate::authorize('delete', $zone);
        $zone->update(['actif' => false]);

        return ApiResponse::ok(new ZoneAdminResource($zone->load('ville')));
    }

    public function importerZones(ImporterZonesRequest $request, ImportZones $import): JsonResponse
    {
        $ville = Ville::query()->where('id_public', $request->validated('ville'))->firstOrFail();

        return ApiResponse::ok($import->importer($ville, $request->file('fichier'), $request->validated('contour_source')));
    }
}
