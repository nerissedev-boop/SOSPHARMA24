<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Controllers;

use App\Commun\Erreurs\ActionInterdite;
use App\Commun\Http\ApiResponse;
use App\Commun\Http\AppareilCourant;
use App\Commun\Http\Requetes\ParametresListe;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Releves\Enums\OrigineReleve;
use App\Modules\Releves\Enums\TypePhoto;
use App\Modules\Releves\Exceptions\PropositionIntrouvable;
use App\Modules\Releves\Http\Requests\EnvoyerPropositionRequest;
use App\Modules\Releves\Http\Requests\PhotoPropositionRequest;
use App\Modules\Releves\Http\Resources\PhotoReleveResource;
use App\Modules\Releves\Http\Resources\PropositionResource;
use App\Modules\Releves\Models\Releve;
use App\Modules\Releves\Services\PhotosReleves;
use App\Modules\Releves\Services\ReceptionPropositions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * « Proposer une pharmacie » : usagers sans compte, identifiés par leur appareil (X-Device-Token).
 * Rien n'est publié avant la validation de l'équipe, dans la même file que les relevés des agents.
 */
class PropositionController extends Controller
{
    /** POST /propositions : 201 à la création, 200 avec la proposition existante si l'identifiant a déjà été reçu. */
    public function store(EnvoyerPropositionRequest $request, ReceptionPropositions $reception): JsonResponse
    {
        $resultat = $reception->recevoir($this->appareil($request), $request->validated());
        $ressource = new PropositionResource($resultat['releve']);

        return $resultat['cree'] ? ApiResponse::created($ressource) : ApiResponse::ok($ressource, ['deja_recu' => true]);
    }

    /** POST /propositions/{id}/photo : la façade, obligatoire ; un nouvel envoi remplace la précédente. */
    public function photo(PhotoPropositionRequest $request, Releve $releve, PhotosReleves $photos): JsonResponse
    {
        $this->verifierProprietaire($request, $releve);
        $photo = $photos->enregistrer($releve, TypePhoto::Facade, $request->file('photo'));

        return ApiResponse::created(new PhotoReleveResource($photo));
    }

    /** GET /propositions : propositions de l'appareil, de la plus récente à la plus ancienne, par curseur. */
    public function index(Request $request, EditionFichesPharmacies $fiches): JsonResponse
    {
        $p = ParametresListe::depuis($request);
        $page = Releve::query()->with(['photos', 'ville'])
            ->where('origine', OrigineReleve::Public->value)
            ->where('appareil_id', $this->appareil($request))
            ->orderByDesc('id')
            ->cursorPaginate($p->parPage);

        foreach ($page->items() as $releve) {
            if ($releve->pharmacie_id !== null) {
                $releve->setAttribute('pharmacie_id_public', $fiches->parId($releve->pharmacie_id)?->idPublic);
            }
        }

        return ApiResponse::cursor($page, PropositionResource::class);
    }

    private function appareil(Request $request): int
    {
        // Route protégée par le middleware « appareil » (obligatoire) : l'identifiant est toujours présent.
        return AppareilCourant::id($request) ?? throw new ActionInterdite('Appareil non reconnu.');
    }

    private function verifierProprietaire(Request $request, Releve $releve): void
    {
        if (! $releve->estPublic() || $releve->appareil_id !== $this->appareil($request)) {
            throw new PropositionIntrouvable;
        }
    }
}
