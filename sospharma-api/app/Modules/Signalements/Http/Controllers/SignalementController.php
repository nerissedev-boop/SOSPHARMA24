<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\AppareilCourant;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Exceptions\PharmacieIntrouvable;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Signalements\Enums\MotifSignalement;
use App\Modules\Signalements\Enums\StatutSignalement;
use App\Modules\Signalements\Http\Requests\CloturerSignalementRequest;
use App\Modules\Signalements\Http\Requests\EnvoyerSignalementRequest;
use App\Modules\Signalements\Http\Resources\SignalementRecuResource;
use App\Modules\Signalements\Http\Resources\SignalementResource;
use App\Modules\Signalements\Models\Signalement;
use App\Modules\Signalements\Services\TraitementSignalements;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SignalementController extends Controller
{
    public function __construct(private readonly TraitementSignalements $traitement) {}

    public function store(EnvoyerSignalementRequest $request, string $pharmacie): JsonResponse
    {
        $modele = Pharmacie::query()->actives()->where('id_public', $pharmacie)->first() ?? throw new PharmacieIntrouvable;
        $signalement = $this->traitement->recevoir(
            $modele,
            MotifSignalement::from($request->validated('motif')),
            $request->validated('precisions'),
            AppareilCourant::id($request),
        );

        return ApiResponse::created(new SignalementRecuResource($signalement));
    }

    /** File à traiter : par défaut les signalements « nouveau ». */
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Signalement::class);
        $p = ParametresListe::depuis($request, ['statut', 'ville', 'motif'], ['cree_le' => 'created_at'], triParDefaut: ['created_at', 'desc']);
        $statut = $p->filtreParmi('statut', array_column(StatutSignalement::cases(), 'value')) ?? StatutSignalement::Nouveau->value;
        $motif = $p->filtreParmi('motif', array_column(MotifSignalement::cases(), 'value'));

        $requete = $this->requeteVisible($request)
            ->where('statut', $statut)
            ->when($p->filtre('ville') !== null, fn ($r) => $r->whereHas('pharmacie.ville', fn ($s) => $s->where('id_public', $p->filtre('ville'))))
            ->when($motif !== null, fn ($r) => $r->where('motif', $motif));

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), SignalementResource::class);
    }

    /** Historique (traités ou rejetés), par curseur. */
    public function historique(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Signalement::class);
        $p = ParametresListe::depuis($request);

        $page = $this->requeteVisible($request)
            ->whereIn('statut', [StatutSignalement::Traite->value, StatutSignalement::Rejete->value])
            ->orderByDesc('id')
            ->cursorPaginate($p->parPage);

        return ApiResponse::cursor($page, SignalementResource::class);
    }

    public function show(Signalement $signalement): JsonResponse
    {
        Gate::authorize('view', $signalement);

        return ApiResponse::ok((new SignalementResource($signalement->load(['pharmacie.ville', 'pharmacie.zone', 'pharmacie.horaires', 'traitePar'])))->avecFicheComplete());
    }

    public function traiter(CloturerSignalementRequest $request, Signalement $signalement): JsonResponse
    {
        return $this->cloturer($request, $signalement, StatutSignalement::Traite);
    }

    public function rejeter(CloturerSignalementRequest $request, Signalement $signalement): JsonResponse
    {
        return $this->cloturer($request, $signalement, StatutSignalement::Rejete);
    }

    private function cloturer(CloturerSignalementRequest $request, Signalement $signalement, StatutSignalement $statut): JsonResponse
    {
        Gate::authorize('traiter', $signalement);
        /** @var CompteAvecRole $compte */
        $compte = $request->user();
        $resultat = $this->traitement->cloturer($signalement, $statut, $request->texte(), $compte);

        return ApiResponse::ok(new SignalementResource($resultat->load(['pharmacie', 'traitePar'])));
    }

    /** @return Builder<Signalement> */
    private function requeteVisible(Request $request): Builder
    {
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        return Signalement::query()->with(['pharmacie', 'traitePar'])
            ->when(! $compte->estAdmin(), fn ($r) => $r->whereHas('pharmacie', fn ($s) => $s->where('ville_id', $compte->villeId())));
    }
}
