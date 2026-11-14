<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Securite\CompteAvecRole;
use App\Commun\Securite\Role;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Enums\OrigineTelephone;
use App\Modules\Pharmacies\Http\Requests\EnregistrerTelephoneRequest;
use App\Modules\Pharmacies\Http\Requests\ModifierTelephoneRequest;
use App\Modules\Pharmacies\Http\Resources\TelephonePharmacieResource;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Models\TelephonePharmacie;
use App\Modules\Pharmacies\Services\TelephonesPharmacie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * Numéros d'une fiche, sous agent/… (agent terrain, dans ses villes) et admin/… (équipe).
 * Le principal en premier ; WhatsApp confirmé par la personne connectée, qui signe sa réponse.
 */
class TelephonePharmacieController extends Controller
{
    public function __construct(private readonly TelephonesPharmacie $telephones) {}

    /** GET …/pharmacies/{id}/telephones : tous les numéros, sans pagination (quatre au plus en pratique). */
    public function index(Pharmacie $pharmacie): JsonResponse
    {
        Gate::authorize('gererTelephones', $pharmacie);

        return ApiResponse::ok(TelephonePharmacieResource::collection($pharmacie->telephones()->get()));
    }

    /** POST …/pharmacies/{id}/telephones : 201 pour un nouveau numéro, 200 et meta.deja_present s'il est déjà sur la fiche. */
    public function store(EnregistrerTelephoneRequest $request, Pharmacie $pharmacie): JsonResponse
    {
        Gate::authorize('gererTelephones', $pharmacie);
        $compte = $this->compte($request);

        $resultat = $this->telephones->enregistrer(
            $pharmacie, $request->numero(), $request->whatsapp(), $request->principal(), $compte, $this->origine($compte),
        );
        $ressource = new TelephonePharmacieResource($resultat['telephone']);

        if (! $resultat['cree']) {
            return ApiResponse::ok($ressource, ['deja_present' => true]);
        }

        return ApiResponse::created($ressource)
            ->header('Location', url($request->path().'/'.$resultat['telephone']->id_public));
    }

    /** PATCH …/pharmacies/{id}/telephones/{tl} : WhatsApp oui / non, et / ou principal. */
    public function update(ModifierTelephoneRequest $request, Pharmacie $pharmacie, TelephonePharmacie $telephone): JsonResponse
    {
        Gate::authorize('gererTelephones', $pharmacie);
        $compte = $this->compte($request);

        return ApiResponse::ok(new TelephonePharmacieResource($this->telephones->modifier(
            $pharmacie, $telephone, $request->whatsapp(), $request->principal(), $compte, $this->origine($compte),
        )));
    }

    /** DELETE …/pharmacies/{id}/telephones/{tl} : 204 ; le principal ne se retire qu'en dernier (422). */
    public function destroy(Request $request, Pharmacie $pharmacie, TelephonePharmacie $telephone): Response
    {
        Gate::authorize('gererTelephones', $pharmacie);
        $this->telephones->retirer($pharmacie, $telephone, $this->compte($request));

        return response()->noContent();
    }

    private function compte(Request $request): CompteAvecRole
    {
        /** @var CompteAvecRole */
        return $request->user();
    }

    private function origine(CompteAvecRole $compte): OrigineTelephone
    {
        return $compte->role() === Role::AgentTerrain ? OrigineTelephone::Agent : OrigineTelephone::Admin;
    }
}
