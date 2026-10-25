<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Http\Requests\EnregistrerPharmacieRequest;
use App\Modules\Pharmacies\Http\Requests\HorairesRequest;
use App\Modules\Pharmacies\Http\Requests\ImporterPharmaciesRequest;
use App\Modules\Pharmacies\Http\Resources\PharmacieAdminResource;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\FiltresPharmacies;
use App\Modules\Pharmacies\Services\GestionPharmacies;
use App\Modules\Pharmacies\Services\ImportPharmacies;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AdminPharmacieController extends Controller
{
    public function __construct(private readonly GestionPharmacies $gestion) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Pharmacie::class);
        $p = ParametresListe::depuis($request, ['ville', 'zone', 'actif', 'h24', 'assurances'], ['nom' => 'nom', 'cree_le' => 'created_at', 'verifiee_le' => 'verifiee_le'], true, ['nom', 'asc']);
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        $assurances = FiltresPharmacies::slugs($p->filtre('assurances'));

        $requete = Pharmacie::query()->with(['ville', 'zone', 'assurances'])
            ->when(! $compte->estAdmin(), fn ($r) => $r->where('ville_id', $compte->villeId()))
            ->when($p->filtre('ville') !== null, fn ($r) => $r->whereHas('ville', fn ($s) => $s->where('id_public', $p->filtre('ville'))))
            ->when($p->filtre('zone') !== null, fn ($r) => $r->whereHas('zone', fn ($s) => $s->where('id_public', $p->filtre('zone'))))
            ->when($p->filtreBooleen('actif') !== null, fn ($r) => $r->where('actif', $p->filtreBooleen('actif')))
            ->when($p->filtreBooleen('h24') !== null, fn ($r) => $r->where('h24', $p->filtreBooleen('h24')))
            ->when($assurances !== null, fn ($r) => FiltresPharmacies::appliquerAssurances($r, (array) $assurances))
            ->when($p->q !== null, function ($r) use ($p): void {
                $motif = '%'.addcslashes((string) $p->q, '%_\\').'%';
                $r->where(fn ($s) => $s->where('nom', 'like', $motif)->orWhere('quartier', 'like', $motif)->orWhere('adresse', 'like', $motif));
            });

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), PharmacieAdminResource::class);
    }

    public function store(EnregistrerPharmacieRequest $request): JsonResponse
    {
        Gate::authorize('create', Pharmacie::class);

        return ApiResponse::created(new PharmacieAdminResource($this->gestion->creer($request->validated())));
    }

    public function show(Pharmacie $pharmacie): JsonResponse
    {
        Gate::authorize('view', $pharmacie);

        return ApiResponse::ok(new PharmacieAdminResource($pharmacie->load(['ville', 'zone', 'horaires', 'assurances'])));
    }

    public function update(EnregistrerPharmacieRequest $request, Pharmacie $pharmacie): JsonResponse
    {
        Gate::authorize('update', $pharmacie);

        return ApiResponse::ok(new PharmacieAdminResource($this->gestion->modifier($pharmacie, $request->validated())));
    }

    public function destroy(Pharmacie $pharmacie): JsonResponse
    {
        Gate::authorize('delete', $pharmacie);

        return ApiResponse::ok(new PharmacieAdminResource($this->gestion->desactiver($pharmacie)));
    }

    public function horaires(HorairesRequest $request, Pharmacie $pharmacie): JsonResponse
    {
        Gate::authorize('update', $pharmacie);
        $h24 = $request->validated('h24');

        return ApiResponse::ok(new PharmacieAdminResource(
            $this->gestion->remplacerHoraires($pharmacie, $request->validated('horaires'), $h24 !== null ? (bool) $h24 : null, true)
        ));
    }

    public function importer(ImporterPharmaciesRequest $request, ImportPharmacies $import): JsonResponse
    {
        Gate::authorize('import', Pharmacie::class);
        $ville = Ville::query()->where('id_public', $request->validated('ville'))->firstOrFail();

        return ApiResponse::created($import->importer($ville, $request->file('fichier')));
    }
}
