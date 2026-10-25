<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Enums\StatutProposition;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Pharmacies\Http\Requests\AssurancesPharmacieRequest;
use App\Modules\Pharmacies\Http\Requests\EnregistrerAssuranceRequest;
use App\Modules\Pharmacies\Http\Requests\TraiterPropositionRequest;
use App\Modules\Pharmacies\Http\Resources\AssuranceAdminResource;
use App\Modules\Pharmacies\Http\Resources\PharmacieAdminResource;
use App\Modules\Pharmacies\Http\Resources\PropositionAssuranceResource;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Models\PropositionAssurance;
use App\Modules\Pharmacies\Services\AssurancesPharmacie;
use App\Modules\Pharmacies\Services\GestionAssurances;
use App\Modules\Pharmacies\Services\TraitementPropositions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** Référentiel des assurances (admin), assurances d'une pharmacie (équipe) et propositions d'assurances absentes (admin). */
class AdminAssuranceController extends Controller
{
    public function __construct(private readonly GestionAssurances $gestion) {}

    /** GET /admin/assurances : par page ; filter[pays|type|actif], q, sort=nom|cree_le. */
    public function index(Request $request): JsonResponse
    {
        $p = ParametresListe::depuis($request, ['pays', 'type', 'actif'], ['nom' => 'nom', 'cree_le' => 'created_at'], true, ['nom', 'asc']);
        $type = $p->filtreParmi('type', array_column(TypeAssurance::cases(), 'value'));

        $requete = Assurance::query()->with('pays')->withCount('pharmacies')
            ->when($p->filtre('pays') !== null, fn ($r) => $r->whereHas('pays', fn ($s) => $s->where('code', mb_strtoupper((string) $p->filtre('pays')))))
            ->when($type !== null, fn ($r) => $r->where('type', $type))
            ->when($p->filtreBooleen('actif') !== null, fn ($r) => $r->where('actif', $p->filtreBooleen('actif')))
            ->when($p->q !== null, function ($r) use ($p): void {
                $motif = '%'.addcslashes((string) $p->q, '%_\\').'%';
                $r->where(fn ($s) => $s->where('nom', 'like', $motif)->orWhere('slug', 'like', $motif));
            });

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), AssuranceAdminResource::class);
    }

    public function store(EnregistrerAssuranceRequest $request): JsonResponse
    {
        return ApiResponse::created(new AssuranceAdminResource($this->gestion->creer($request->validated())));
    }

    public function update(EnregistrerAssuranceRequest $request, Assurance $assurance): JsonResponse
    {
        return ApiResponse::ok(new AssuranceAdminResource($this->gestion->modifier($assurance, $request->validated())));
    }

    /** DELETE : désactive (pas de suppression réelle). */
    public function destroy(Assurance $assurance): JsonResponse
    {
        return ApiResponse::ok(new AssuranceAdminResource($this->gestion->desactiver($assurance)));
    }

    /** PUT /admin/pharmacies/{id}/assurances : remplace toutes les assurances (identifiant, tiers payant, remarque). */
    public function pharmacie(AssurancesPharmacieRequest $request, Pharmacie $pharmacie, AssurancesPharmacie $assurances): JsonResponse
    {
        Gate::authorize('update', $pharmacie);
        $assurances->remplacer($pharmacie, $request->lignes());

        return ApiResponse::ok(new PharmacieAdminResource($pharmacie->load(['ville', 'zone', 'horaires', 'assurances'])));
    }

    /** GET /admin/assurances/propositions : par page ; filter[statut] (en_attente par défaut), filter[pays], filter[source]. */
    public function propositions(Request $request): JsonResponse
    {
        $p = ParametresListe::depuis($request, ['statut', 'pays', 'source'], ['cree_le' => 'created_at'], triParDefaut: ['created_at', 'asc']);
        $statut = $p->filtreParmi('statut', array_column(StatutProposition::cases(), 'value')) ?? StatutProposition::EnAttente->value;
        $source = $p->filtreParmi('source', ['releve', 'pharmacien', 'migration']);

        $requete = PropositionAssurance::query()->with(['pays', 'pharmacie', 'assurance', 'proposePar', 'traitePar'])
            ->where('statut', $statut)
            ->when($source !== null, fn ($r) => $r->where('source', $source))
            ->when($p->filtre('pays') !== null, fn ($r) => $r->whereHas('pays', fn ($s) => $s->where('code', mb_strtoupper((string) $p->filtre('pays')))));

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), PropositionAssuranceResource::class);
    }

    public function accepter(TraiterPropositionRequest $request, PropositionAssurance $proposition, TraitementPropositions $traitement): JsonResponse
    {
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        return ApiResponse::ok(new PropositionAssuranceResource($traitement->accepter($proposition, $request->validated(), $compte)));
    }

    public function rejeter(TraiterPropositionRequest $request, PropositionAssurance $proposition, TraitementPropositions $traitement): JsonResponse
    {
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        return ApiResponse::ok(new PropositionAssuranceResource($traitement->rejeter($proposition, (string) $request->validated('raison'), $compte)));
    }
}
