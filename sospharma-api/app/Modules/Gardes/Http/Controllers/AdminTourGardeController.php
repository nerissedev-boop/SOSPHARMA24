<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Http\Requests\EnregistrerTourRequest;
use App\Modules\Gardes\Http\Requests\GardeDuTourRequest;
use App\Modules\Gardes\Http\Requests\ImporterTourRequest;
use App\Modules\Gardes\Http\Resources\GardeResource;
use App\Modules\Gardes\Http\Resources\TourGardeResource;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Gardes\Services\ControleTourGarde;
use App\Modules\Gardes\Services\GestionToursGarde;
use App\Modules\Gardes\Services\ImportTourGarde;
use App\Modules\Gardes\Services\ProblemeControle;
use App\Modules\Gardes\Services\PublicationTourGarde;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AdminTourGardeController extends Controller
{
    private const RELATIONS = ['ville', 'secteur', 'gardes.pharmacie.zone', 'saisiPar', 'validePar'];

    public function __construct(private readonly GestionToursGarde $gestion) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', TourGarde::class);
        $p = ParametresListe::depuis($request, ['ville', 'statut'], ['debut' => 'debut', 'cree_le' => 'created_at'], triParDefaut: ['debut', 'desc']);
        $statut = $p->filtreParmi('statut', array_column(StatutTour::cases(), 'value'));
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        $requete = TourGarde::query()->with(['ville', 'secteur', 'saisiPar', 'validePar'])->withCount('gardes')
            ->where('actif', true)
            ->when(! $compte->estAdmin(), fn ($r) => $r->where('ville_id', $compte->villeId()))
            ->when($p->filtre('ville') !== null, fn ($r) => $r->whereHas('ville', fn ($s) => $s->where('id_public', $p->filtre('ville'))))
            ->when($statut !== null, fn ($r) => $r->where('statut', $statut));

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), TourGardeResource::class);
    }

    public function store(EnregistrerTourRequest $request): JsonResponse
    {
        $this->autoriserVille($request->validated('ville'));

        return ApiResponse::created(new TourGardeResource($this->gestion->creer($request->validated(), $request->compte())->load(self::RELATIONS)));
    }

    public function show(TourGarde $tour): JsonResponse
    {
        Gate::authorize('view', $tour);

        return ApiResponse::ok(new TourGardeResource($tour->load(self::RELATIONS)));
    }

    public function update(EnregistrerTourRequest $request, TourGarde $tour): JsonResponse
    {
        Gate::authorize('update', $tour);

        return ApiResponse::ok(new TourGardeResource($this->gestion->modifier($tour, $request->validated())->load(self::RELATIONS)));
    }

    public function destroy(TourGarde $tour): JsonResponse
    {
        Gate::authorize('delete', $tour);
        $this->gestion->supprimer($tour);

        return ApiResponse::ok(null);
    }

    public function importer(ImporterTourRequest $request, ImportTourGarde $import): JsonResponse
    {
        $this->autoriserVille($request->validated('ville'));
        $periode = $request->safe()->only(['ville', 'secteur', 'debut', 'fin']);

        return ApiResponse::created(new TourGardeResource($import->importer($periode, $request->file('fichier'), $request->compte())->load(self::RELATIONS)));
    }

    public function controler(TourGarde $tour, ControleTourGarde $controle): JsonResponse
    {
        Gate::authorize('view', $tour);
        $problemes = $controle->controler($tour);

        return ApiResponse::ok([
            'tour' => $tour->id_public,
            'publiable' => array_filter($problemes, fn (ProblemeControle $p): bool => $p->estBloquant()) === [],
            'problemes' => array_map(fn (ProblemeControle $p): array => $p->versTableau(), $problemes),
        ]);
    }

    public function publier(Request $request, TourGarde $tour, PublicationTourGarde $publication): JsonResponse
    {
        Gate::authorize('publier', $tour);
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        return ApiResponse::ok(new TourGardeResource($publication->publier($tour, $compte)));
    }

    public function ajouterGarde(GardeDuTourRequest $request, TourGarde $tour): JsonResponse
    {
        Gate::authorize('update', $tour);
        $garde = $this->gestion->ajouterGarde($tour, $request->validated('pharmacie'), $request->validated('debut'), $request->validated('fin'));

        return ApiResponse::created(new GardeResource($garde->load(['tour', 'pharmacie.zone'])));
    }

    public function retirerGarde(GardeDuTourRequest $request, TourGarde $tour): JsonResponse
    {
        Gate::authorize('update', $tour);
        $this->gestion->retirerGarde($tour, $request->validated('pharmacie'));

        return ApiResponse::ok(new TourGardeResource($tour->load(self::RELATIONS)));
    }

    private function autoriserVille(string $villeIdPublic): void
    {
        $villeId = (int) Ville::query()->where('id_public', $villeIdPublic)->value('id');
        Gate::authorize('create', [TourGarde::class, $villeId]);
    }
}
