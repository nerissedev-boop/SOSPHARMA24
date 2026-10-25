<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypePhoto;
use App\Modules\Releves\Http\Requests\EnregistrerReleveRequest;
use App\Modules\Releves\Http\Requests\PhotoReleveRequest;
use App\Modules\Releves\Http\Requests\ProchesAgentRequest;
use App\Modules\Releves\Http\Resources\DoublonResource;
use App\Modules\Releves\Http\Resources\PhotoReleveResource;
use App\Modules\Releves\Http\Resources\ReleveResource;
use App\Modules\Releves\Models\Releve;
use App\Modules\Releves\Services\DetectionDoublons;
use App\Modules\Releves\Services\PhotosReleves;
use App\Modules\Releves\Services\ReceptionReleves;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** Espace agent de l'app mobile : doublons autour de soi, envoi et correction des relevés, photos, suivi. */
class AgentReleveController extends Controller
{
    public function __construct(private readonly ReceptionReleves $reception) {}

    /** GET /agent/pharmacies/proches : pharmacies connues à 100 m au plus (doublons possibles). */
    public function proches(ProchesAgentRequest $request, DetectionDoublons $doublons): JsonResponse
    {
        $trouves = $doublons->autour($request->latitude(), $request->longitude(), $request->rayon(), $request->limite());

        return ApiResponse::ok(array_map(fn (array $d) => new DoublonResource($d), $trouves), [
            'rayon' => $request->rayon(),
            'limite' => $request->limite(),
            'nombre' => count($trouves),
        ]);
    }

    /** POST /agent/releves : 201 à la création, 200 avec le relevé existant si l'identifiant a déjà été reçu. */
    public function store(EnregistrerReleveRequest $request): JsonResponse
    {
        $resultat = $this->reception->recevoir($this->agent($request), $request->validated());
        $ressource = new ReleveResource($resultat['releve']->load(['photos', 'ville']));

        return $resultat['cree'] ? ApiResponse::created($ressource) : ApiResponse::ok($ressource, ['deja_recu' => true]);
    }

    /** POST /agent/releves/{id}/photos : une photo par type, la nouvelle remplace l'ancienne. */
    public function photo(PhotoReleveRequest $request, Releve $releve, PhotosReleves $photos): JsonResponse
    {
        Gate::authorize('modifier', $releve);
        $photo = $photos->enregistrer($releve, TypePhoto::from((string) $request->validated('type')), $request->file('photo'));

        return ApiResponse::created(new PhotoReleveResource($photo));
    }

    /** GET /agent/releves : ses relevés, du plus récent au plus ancien, par curseur ; filter[statut]. */
    public function index(Request $request): JsonResponse
    {
        $p = ParametresListe::depuis($request, ['statut']);
        $statut = $p->filtreParmi('statut', array_column(StatutReleve::cases(), 'value'));

        $page = Releve::query()->with(['photos', 'ville'])
            ->where('agent_id', $this->agent($request)->idInterne())
            ->when($statut !== null, fn ($r) => $r->where('statut', $statut))
            ->orderByDesc('id')
            ->cursorPaginate($p->parPage);

        return ApiResponse::cursor($page, ReleveResource::class);
    }

    /** PATCH /agent/releves/{id} : corrige un relevé « à corriger », qui repart dans la file. */
    public function update(EnregistrerReleveRequest $request, Releve $releve): JsonResponse
    {
        Gate::authorize('modifier', $releve);

        return ApiResponse::ok(new ReleveResource($this->reception->corriger($releve, $this->agent($request), $request->validated())->load('ville')));
    }

    private function agent(Request $request): CompteAvecRole
    {
        /** @var CompteAvecRole */
        return $request->user();
    }
}
