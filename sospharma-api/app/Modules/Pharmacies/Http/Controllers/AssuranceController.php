<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\AppareilCourant;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Http\Requests\AssurancesAppareilRequest;
use App\Modules\Pharmacies\Http\Resources\AssuranceResource;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Services\AssurancesAppareil;
use App\Modules\Territoire\Exceptions\PaysIntrouvable;
use App\Modules\Territoire\Models\Pays;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Référentiel public d'un pays et « Mes assurances » de l'appareil (sans compte). */
class AssuranceController extends Controller
{
    public function __construct(private readonly AssurancesAppareil $appareils) {}

    /** GET /pays/{code}/assurances : assurances actives, régimes publics d'abord. Petite liste, sans pagination. */
    public function index(Pays $pays): JsonResponse
    {
        if (! $pays->actif) {
            throw new PaysIntrouvable;
        }
        $assurances = Assurance::query()->actives()->where('pays_id', $pays->id)->get()
            ->sortBy(fn (Assurance $a): string => $a->type->rang().'|'.mb_strtolower($a->nom))
            ->values();

        return ApiResponse::ok(AssuranceResource::collection($assurances));
    }

    /** GET /appareils/moi/assurances */
    public function mesAssurances(Request $request): JsonResponse
    {
        return ApiResponse::ok(AssuranceResource::collection($this->appareils->liste($this->appareilId($request))));
    }

    /** PUT /appareils/moi/assurances : remplace toute la liste. */
    public function remplacerMesAssurances(AssurancesAppareilRequest $request): JsonResponse
    {
        $assurances = $this->appareils->remplacer($this->appareilId($request), array_values((array) $request->validated('assurances')));

        return ApiResponse::ok(AssuranceResource::collection($assurances));
    }

    private function appareilId(Request $request): int
    {
        // Le middleware « appareil » (module Notifications) a déjà exigé un appareil reconnu.
        return AppareilCourant::id($request) ?? throw new AuthenticationException;
    }
}
