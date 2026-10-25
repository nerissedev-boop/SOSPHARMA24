<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Modules\Notifications\Http\Requests\EnregistrerAppareilRequest;
use App\Modules\Notifications\Http\Requests\FavoriRequest;
use App\Modules\Notifications\Http\Resources\AppareilResource;
use App\Modules\Notifications\Models\Appareil;
use App\Modules\Notifications\Services\GestionAppareils;
use App\Modules\Pharmacies\Exceptions\PharmacieIntrouvable;
use App\Modules\Pharmacies\Http\Resources\PharmacieListeResource;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\PharmacieTrouvee;
use App\Modules\Pharmacies\Services\StatutsPharmacies;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Appareil (sans compte) : enregistrement, préférences, favoris. */
class AppareilController extends Controller
{
    public function __construct(private readonly GestionAppareils $gestion) {}

    public function store(EnregistrerAppareilRequest $request): JsonResponse
    {
        $resultat = $this->gestion->enregistrer($request->validated());

        // Le jeton n'est montré qu'ici : l'app l'envoie ensuite dans l'en-tête X-Device-Token.
        return ApiResponse::created([
            'appareil' => new AppareilResource($resultat['appareil']),
            'jeton' => $resultat['jeton'],
        ]);
    }

    public function update(EnregistrerAppareilRequest $request): JsonResponse
    {
        return ApiResponse::ok(new AppareilResource($this->gestion->modifier($this->appareil($request), $request->validated())));
    }

    public function destroy(Request $request): JsonResponse
    {
        return ApiResponse::ok(new AppareilResource($this->gestion->desactiverNotifications($this->appareil($request))));
    }

    public function favoris(Request $request, StatutsPharmacies $statuts): JsonResponse
    {
        $pharmacies = $this->appareil($request)->favoris()->actives()->with(['zone', 'ville:id,id_public,nom', 'horaires', 'assurancesActives'])->orderBy('nom')->get();
        $parId = $statuts->pour($pharmacies);

        return ApiResponse::ok($pharmacies->map(fn (Pharmacie $p) => new PharmacieListeResource(new PharmacieTrouvee($p, $parId[$p->id])))->values());
    }

    public function ajouterFavori(FavoriRequest $request): JsonResponse
    {
        $pharmacie = Pharmacie::query()->actives()->where('id_public', $request->validated('pharmacie'))->first()
            ?? throw new PharmacieIntrouvable;
        $this->appareil($request)->favoris()->syncWithoutDetaching([$pharmacie->id]);

        return ApiResponse::created(['pharmacie' => $pharmacie->id_public]);
    }

    public function retirerFavori(Request $request, string $pharmacie): JsonResponse
    {
        $modele = Pharmacie::query()->where('id_public', $pharmacie)->first() ?? throw new PharmacieIntrouvable;
        $this->appareil($request)->favoris()->detach($modele->id);

        return ApiResponse::ok(null);
    }

    private function appareil(Request $request): Appareil
    {
        /** @var Appareil */
        return $request->attributes->get('appareil');
    }
}
