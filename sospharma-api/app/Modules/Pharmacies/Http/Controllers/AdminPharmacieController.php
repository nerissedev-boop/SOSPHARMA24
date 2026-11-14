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
use App\Modules\Pharmacies\Services\ExportPharmacies;
use App\Modules\Pharmacies\Services\FiltresPharmacies;
use App\Modules\Pharmacies\Services\GestionPharmacies;
use App\Modules\Pharmacies\Services\ImportPharmacies;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPharmacieController extends Controller
{
    public function __construct(private readonly GestionPharmacies $gestion) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Pharmacie::class);
        [$p, $requete] = $this->liste($request);

        return ApiResponse::paginated(
            $requete->with(['ville', 'zone', 'assurances', 'telephones'])->paginate($p->parPage, ['*'], 'page', $p->page),
            PharmacieAdminResource::class,
        );
    }

    /**
     * Mêmes filtres et tri que index, sans pagination : le CSV que l'import relit (décision 60).
     * Écrit en flux, par paquets de 500 fiches, pour tenir dans la mémoire de l'hébergement mutualisé.
     */
    public function exporter(Request $request, ExportPharmacies $export): StreamedResponse
    {
        Gate::authorize('viewAny', Pharmacie::class);
        [$p, $requete] = $this->liste($request);
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        $ville = $compte->estAdmin()
            ? ($p->filtre('ville') !== null ? Ville::query()->where('id_public', $p->filtre('ville'))->first() : null)
            : Ville::query()->find($compte->villeId());
        $nom = 'pharmacies-'.($ville !== null ? Str::slug($ville->nom) : 'toutes').'-'.now()->format('Y-m-d').'.csv';

        // Tri complété par l'id : les paquets se suivent sans sauter ni répéter deux homonymes.
        $fiches = $requete->with(['ville.pays', 'zone', 'assurances', 'telephones'])->orderBy('pharmacies.id')->lazy(500);

        return response()->stream(function () use ($export, $fiches, $p, $compte): void {
            $flux = fopen('php://output', 'wb');
            $lignes = $export->ecrire($flux, $fiches);
            fclose($flux);
            Log::info('Annuaire des pharmacies exporté', [
                'lignes' => $lignes, 'filtres' => $p->filtres, 'recherche' => $p->q !== null, 'compte_id' => $compte->idInterne(),
            ]);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$nom.'"',
            'Cache-Control' => 'no-store',
        ]);
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

        $simulation = $request->boolean('simulation');
        $exclure = array_map('intval', (array) $request->validated('exclure', []));
        $bilan = $import->importer($ville, $request->file('fichier'), $simulation, $exclure);

        return $simulation ? ApiResponse::ok($bilan) : ApiResponse::created($bilan);
    }

    /**
     * Filtres et tri de la liste de l'équipe ; l'éditeur ne voit que sa ville.
     *
     * @return array{0: ParametresListe, 1: Builder<Pharmacie>}
     */
    private function liste(Request $request): array
    {
        $p = ParametresListe::depuis($request, ['ville', 'zone', 'actif', 'h24', 'assurances'], ['nom' => 'nom', 'cree_le' => 'created_at', 'verifiee_le' => 'verifiee_le'], true, ['nom', 'asc']);
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        $assurances = FiltresPharmacies::slugs($p->filtre('assurances'));

        $requete = Pharmacie::query()
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

        return [$p, $p->trier($requete)];
    }
}
