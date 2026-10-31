<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Controllers;

use App\Commun\Erreurs\RequeteInvalide;
use App\Commun\Geo\Geometrie;
use App\Commun\Geo\TrajetVoiture;
use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Http\Requetes\PositionRequest;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Exceptions\PharmacieIntrouvable;
use App\Modules\Pharmacies\Http\Requests\CadreRequest;
use App\Modules\Pharmacies\Http\Requests\ProchesRequest;
use App\Modules\Pharmacies\Http\Requests\RechercheRequest;
use App\Modules\Pharmacies\Http\Resources\CompteurCommuneResource;
use App\Modules\Pharmacies\Http\Resources\PharmacieFicheResource;
use App\Modules\Pharmacies\Http\Resources\PharmacieListeResource;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\FiltresPharmacies;
use App\Modules\Pharmacies\Services\PharmacieTrouvee;
use App\Modules\Pharmacies\Services\RecherchePharmacies;
use App\Modules\Pharmacies\Services\StatutsPharmacies;
use App\Modules\Territoire\Contrats\CompteurZones;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Exceptions\VilleIntrouvable;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

/** Routes publiques de l'app : proches (rayon + limite), cadre (plafond 300), recherche, fiche, compteurs. */
class PharmacieController extends Controller
{
    public function __construct(private readonly RecherchePharmacies $recherche) {}

    public function proches(ProchesRequest $request): JsonResponse
    {
        $filtres = FiltresPharmacies::depuis(ParametresListe::depuis($request, FiltresPharmacies::NOMS));
        $trouvees = $this->recherche->proches($request->latitude(), $request->longitude(), $request->rayon(), $request->limite(), $filtres);

        return ApiResponse::ok(self::lignes($trouvees), [
            'rayon' => $request->rayon(),
            'limite' => $request->limite(),
            'nombre' => count($trouvees),
        ]);
    }

    public function cadre(CadreRequest $request): JsonResponse
    {
        $filtres = FiltresPharmacies::depuis(ParametresListe::depuis($request, FiltresPharmacies::NOMS));
        try {
            $cadre = Geometrie::bboxDepuisChaine((string) $request->validated('bbox'));
        } catch (InvalidArgumentException $e) {
            throw new RequeteInvalide($e->getMessage(), ['bbox' => [$e->getMessage()]], $e);
        }
        $resultat = $this->recherche->cadre($cadre, $filtres);

        return ApiResponse::ok(self::lignes($resultat['pharmacies']), [
            'nombre' => count($resultat['pharmacies']),
            'tronque' => $resultat['tronque'],
        ]);
    }

    public function rechercher(RechercheRequest $request): JsonResponse
    {
        ParametresListe::depuis($request, rechercheAutorisee: true);
        $villeId = $request->validated('ville') !== null
            ? Ville::query()->where('id_public', $request->validated('ville'))->value('id')
            : null;
        $lat = $request->validated('lat');
        $lng = $request->validated('lng');
        $limite = (int) $request->validated('limite', RecherchePharmacies::LIMITE_DEFAUT);

        $trouvees = $this->recherche->rechercher(
            (string) $request->validated('q'),
            $villeId !== null ? (int) $villeId : null,
            $lat !== null ? (float) $lat : null,
            $lng !== null ? (float) $lng : null,
            $limite,
        );

        return ApiResponse::ok(self::lignes($trouvees), ['rayon' => null, 'limite' => $limite, 'nombre' => count($trouvees)]);
    }

    public function show(string $pharmacie, StatutsPharmacies $statuts): JsonResponse
    {
        $modele = Pharmacie::query()->actives()->where('id_public', $pharmacie)->with(['zone', 'ville.pays', 'horaires', 'assurancesActives'])->first()
            ?? throw new PharmacieIntrouvable;

        return ApiResponse::ok(new PharmacieFicheResource(new PharmacieTrouvee($modele, $statuts->pourUne($modele))));
    }

    /**
     * Trajet en voiture depuis la position de l'usager (API Routes de Google, trafic compris).
     * `voiture` vaut null sans clé configurée ou si Google ne répond pas : l'app garde son estimation.
     */
    public function trajet(string $pharmacie, PositionRequest $request, TrajetVoiture $trajets): JsonResponse
    {
        $modele = Pharmacie::query()->actives()->where('id_public', $pharmacie)->first(['latitude', 'longitude'])
            ?? throw new PharmacieIntrouvable;
        $voiture = $trajets->calculer($request->latitude(), $request->longitude(), $modele->lat(), $modele->lng());

        return ApiResponse::ok(['voiture' => $voiture, 'source' => $voiture !== null ? 'google' : null]);
    }

    public function compteurs(Ville $ville, CompteurZones $compteurs): JsonResponse
    {
        if (! $ville->actif) {
            throw new VilleIntrouvable;
        }
        $communes = Zone::query()->where('ville_id', $ville->id)->where('actif', true)
            ->where('type', TypeZone::Commune->value)->orderBy('nom')
            ->get(['id', 'id_public', 'nom', 'type', 'centre_lat', 'centre_lng']);
        $parZone = $compteurs->compter($communes->pluck('id')->all());

        return ApiResponse::ok($communes->map(fn (Zone $zone) => new CompteurCommuneResource([
            'zone' => $zone,
            'pharmacies' => $parZone[$zone->id]['pharmacies'] ?? 0,
            'gardes' => $parZone[$zone->id]['gardes'] ?? 0,
        ]))->values());
    }

    /**
     * @param  list<PharmacieTrouvee>  $trouvees
     * @return list<PharmacieListeResource>
     */
    private static function lignes(array $trouvees): array
    {
        return array_map(fn (PharmacieTrouvee $t) => new PharmacieListeResource($t), $trouvees);
    }
}
