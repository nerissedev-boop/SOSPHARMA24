<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Enums\SourceProposition;
use App\Modules\Pharmacies\Http\Requests\AssurancesPharmacieRequest;
use App\Modules\Pharmacies\Http\Requests\FichePharmacienRequest;
use App\Modules\Pharmacies\Http\Requests\HorairesRequest;
use App\Modules\Pharmacies\Http\Resources\PharmacieAdminResource;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\AssurancesPharmacie;
use App\Modules\Pharmacies\Services\GestionPharmacies;
use App\Modules\Pharmacies\Services\PharmaciesDuCompte;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Espace pharmacien : sa fiche (téléphone, WhatsApp, services), ses assurances et ses horaires. */
class EspacePharmacienController extends Controller
{
    public function __construct(
        private readonly PharmaciesDuCompte $rattachements,
        private readonly GestionPharmacies $gestion,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::ok(new PharmacieAdminResource($this->pharmacie($request)->load(['ville', 'zone', 'horaires', 'assurances'])));
    }

    public function update(FichePharmacienRequest $request): JsonResponse
    {
        return ApiResponse::ok(new PharmacieAdminResource($this->gestion->modifierParPharmacien($this->pharmacie($request), $request->validated())));
    }

    public function horaires(HorairesRequest $request): JsonResponse
    {
        $h24 = $request->validated('h24');

        return ApiResponse::ok(new PharmacieAdminResource(
            $this->gestion->remplacerHoraires($this->pharmacie($request), $request->validated('horaires'), $h24 !== null ? (bool) $h24 : null, true)
        ));
    }

    /**
     * PUT /pharmacien/pharmacie/assurances : remplace ses assurances ; « propositions » (noms libres)
     * pour celles qui manquent au référentiel, validées ensuite par l'équipe. La fiche passe « vérifiée ».
     */
    public function assurances(AssurancesPharmacieRequest $request, AssurancesPharmacie $assurances): JsonResponse
    {
        $pharmacie = $this->pharmacie($request);
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        DB::transaction(function () use ($pharmacie, $request, $assurances, $compte): void {
            $assurances->remplacer($pharmacie, $request->lignes());
            $assurances->proposer($pharmacie->ville_id, $pharmacie->id, $request->propositions(), SourceProposition::Pharmacien, $compte->idInterne());
            $pharmacie->update(['verifiee_le' => now()]);
        });

        return ApiResponse::ok(new PharmacieAdminResource($pharmacie->load(['ville', 'zone', 'horaires', 'assurances'])));
    }

    private function pharmacie(Request $request): Pharmacie
    {
        /** @var CompteAvecRole $compte */
        $compte = $request->user();
        $choix = $request->query('pharmacie');

        return $this->rattachements->pharmacieCourante($compte, is_string($choix) ? $choix : null);
    }
}
