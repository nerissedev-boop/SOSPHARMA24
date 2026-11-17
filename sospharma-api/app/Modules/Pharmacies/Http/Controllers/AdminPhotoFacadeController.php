<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacies\Http\Requests\PhotoFacadeRequest;
use App\Modules\Pharmacies\Http\Resources\PharmacieAdminResource;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\PhotosFacades;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Photo de façade d'une fiche, posée ou retirée par l'équipe (admin, éditeur de sa ville).
 * POST (multipart, champ `photo`) remplace la photo ; DELETE la retire. Les deux renvoient la fiche.
 */
class AdminPhotoFacadeController extends Controller
{
    public function __construct(private readonly PhotosFacades $photos) {}

    public function store(PhotoFacadeRequest $request, Pharmacie $pharmacie): JsonResponse
    {
        Gate::authorize('update', $pharmacie);
        $fiche = $this->photos->remplacer($pharmacie, $request->file('photo'), $this->compte($request));

        return ApiResponse::ok(new PharmacieAdminResource($fiche->load(['ville', 'zone', 'horaires', 'assurances'])));
    }

    public function destroy(Request $request, Pharmacie $pharmacie): JsonResponse
    {
        Gate::authorize('update', $pharmacie);
        $fiche = $this->photos->retirer($pharmacie, $this->compte($request));

        return ApiResponse::ok(new PharmacieAdminResource($fiche->load(['ville', 'zone', 'horaires', 'assurances'])));
    }

    private function compte(Request $request): CompteAvecRole
    {
        /** @var CompteAvecRole */
        return $request->user();
    }
}
