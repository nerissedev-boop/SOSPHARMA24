<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Commun\Support\Dates;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Releves\Enums\OrigineReleve;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypeReleve;
use App\Modules\Releves\Exceptions\PhotoIntrouvable;
use App\Modules\Releves\Http\Requests\CommentaireReleveRequest;
use App\Modules\Releves\Http\Requests\ValiderReleveRequest;
use App\Modules\Releves\Http\Resources\DoublonResource;
use App\Modules\Releves\Http\Resources\ReleveAdminResource;
use App\Modules\Releves\Models\PhotoReleve;
use App\Modules\Releves\Models\Releve;
use App\Modules\Releves\Services\ComparaisonReleve;
use App\Modules\Releves\Services\DetectionDoublons;
use App\Modules\Releves\Services\PhotosReleves;
use App\Modules\Releves\Services\ValidationReleves;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** File de validation des relevés (admin : toutes les villes ; éditeur : sa ville). */
class AdminReleveController extends Controller
{
    public function __construct(private readonly ValidationReleves $validation) {}

    /**
     * GET /admin/releves : par page ; filter[ville|statut|agent|type|origine] (statut « envoye » par défaut), sort=recu_le|releve_le.
     * Sans tri demandé : relevés d'agents d'abord, puis propositions d'usagers des appareils les plus fiables
     * (acceptées moins refusées), puis les plus anciens.
     */
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Releve::class);
        $p = ParametresListe::depuis($request, ['ville', 'statut', 'agent', 'type', 'origine'], ['recu_le' => 'recu_le', 'releve_le' => 'releve_le'], triParDefaut: ['recu_le', 'asc']);
        $origine = $p->filtreParmi('origine', array_column(OrigineReleve::cases(), 'value'));
        $statut = $p->filtreParmi('statut', array_column(StatutReleve::cases(), 'value')) ?? StatutReleve::Envoye->value;
        $type = $p->filtreParmi('type', array_column(TypeReleve::cases(), 'value'));

        $requete = $this->requeteVisible($request)
            ->where('statut', $statut)
            ->when($type !== null, fn ($r) => $r->where('type', $type))
            ->when($origine !== null, fn ($r) => $r->where('origine', $origine))
            ->when($p->filtre('ville') !== null, fn ($r) => $r->whereHas('ville', fn ($s) => $s->where('id_public', $p->filtre('ville'))))
            ->when($p->filtre('agent') !== null, fn ($r) => $r->whereHas('agent', fn ($s) => $s->where('id_public', $p->filtre('agent'))));

        if (! $request->filled('sort')) {
            $requete->orderByRaw("CASE WHEN origine = 'agent' THEN 0 ELSE 1 END")
                ->orderByRaw(
                    "(SELECT COALESCE(SUM(CASE WHEN r2.statut = 'valide' THEN 1 WHEN r2.statut = 'rejete' THEN -1 ELSE 0 END), 0)
                      FROM releves r2 WHERE r2.origine = 'public' AND r2.appareil_id = releves.appareil_id) DESC"
                );
        }

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), ReleveAdminResource::class);
    }

    /** GET /admin/releves/{id} : détail, photos, pharmacie concernée, comparaison avant/après, doublons à 100 m. */
    public function show(Request $request, Releve $releve, EditionFichesPharmacies $fiches, ComparaisonReleve $comparaison, DetectionDoublons $doublons): JsonResponse
    {
        Gate::authorize('view', $releve);
        $releve->load(['photos', 'agent', 'traitePar', 'ville']);
        $fiche = $releve->pharmacie_id !== null ? $fiches->parId($releve->pharmacie_id) : null;

        return ApiResponse::ok((new ReleveAdminResource($releve))->avecDetail([
            'pharmacie' => $fiche !== null ? [
                'id' => $fiche->idPublic,
                'nom' => $fiche->nom,
                'photo_facade' => $fiche->photoFacadeUrl,
                'verifiee_le' => Dates::iso($fiche->verifieeLe),
                'actif' => $fiche->actif,
            ] : null,
            'comparaison' => $comparaison->comparer($releve),
            // « ecarte_par_usager » : l'usager a vu cette pharmacie avant d'envoyer sa proposition et a répondu « Non, c'est une autre ».
            'doublons' => array_map(
                fn (array $d): array => ($r = (new DoublonResource($d))->resolve($request)) + ['ecarte_par_usager' => in_array($r['id'] ?? null, $releve->doublons_ecartes ?? [], true)],
                $doublons->autour($releve->lat(), $releve->lng(), DetectionDoublons::RAYON_M, DetectionDoublons::LIMITE_MAX, $releve->pharmacie_id),
            ),
        ]));
    }

    /** GET /admin/releves/{id}/photos/{photo} : le fichier privé (réponse binaire, pas d'enveloppe JSON). */
    public function photo(Releve $releve, string $photo, PhotosReleves $photos): StreamedResponse
    {
        Gate::authorize('view', $releve);
        $modele = PhotoReleve::query()->where('releve_id', $releve->id)->where('id_public', $photo)->first() ?? throw new PhotoIntrouvable;
        $fichier = $photos->fichier($modele);

        return Storage::disk(PhotosReleves::DISQUE_PRIVE)->response($fichier['chemin'], null, ['Content-Type' => $fichier['type'], 'Cache-Control' => 'private, max-age=300']);
    }

    /** POST /admin/releves/{id}/valider : crée ou met à jour la pharmacie, publie la photo de façade. */
    public function valider(ValiderReleveRequest $request, Releve $releve): JsonResponse
    {
        Gate::authorize('traiter', $releve);

        return ApiResponse::ok(new ReleveAdminResource($this->validation->valider(
            $releve,
            $this->compte($request),
            (array) $request->validated('corrections', []),
            $request->validated('fusionner_avec'),
        )));
    }

    /** POST /admin/releves/{id}/a-corriger : renvoie à l'agent avec un commentaire (refusé pour une proposition d'usager). */
    public function aCorriger(CommentaireReleveRequest $request, Releve $releve): JsonResponse
    {
        Gate::authorize('traiter', $releve);

        return ApiResponse::ok(new ReleveAdminResource($this->validation->demanderCorrection($releve, $this->compte($request), $request->texte())));
    }

    /** POST /admin/releves/{id}/rejeter : rejette avec la raison. */
    public function rejeter(CommentaireReleveRequest $request, Releve $releve): JsonResponse
    {
        Gate::authorize('traiter', $releve);

        return ApiResponse::ok(new ReleveAdminResource($this->validation->rejeter($releve, $this->compte($request), $request->texte())));
    }

    /** @return Builder<Releve> */
    private function requeteVisible(Request $request): Builder
    {
        $compte = $this->compte($request);

        return Releve::query()->with(['photos', 'agent', 'traitePar', 'ville'])
            ->when(! $compte->estAdmin(), fn ($r) => $r->where('ville_id', $compte->villeId()));
    }

    private function compte(Request $request): CompteAvecRole
    {
        /** @var CompteAvecRole */
        return $request->user();
    }
}
