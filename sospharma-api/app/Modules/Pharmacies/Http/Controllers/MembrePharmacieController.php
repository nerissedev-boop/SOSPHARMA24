<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Controllers;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Http\ApiResponse;
use App\Commun\Securite\Role;
use App\Http\Controllers\Controller;
use App\Modules\Comptes\Models\User;
use App\Modules\Pharmacies\Http\Requests\RattacherPharmacieRequest;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\PharmaciesDuCompte;
use Illuminate\Http\JsonResponse;

/**
 * POST / DELETE /admin/comptes/{compte}/pharmacies : rattacher ou détacher une pharmacie.
 * Placé dans Pharmacies (propriétaire de membres_pharmacie) car Comptes ne dépend d'aucun module.
 */
class MembrePharmacieController extends Controller
{
    public function __construct(private readonly PharmaciesDuCompte $rattachements) {}

    public function rattacher(RattacherPharmacieRequest $request, User $compte): JsonResponse
    {
        if ($compte->role !== Role::Pharmacien) {
            throw new DonneesInvalides('Seul un compte pharmacien peut être rattaché à une pharmacie.', ['compte' => ['Rôle pharmacien attendu.']]);
        }
        $pharmacie = Pharmacie::query()->where('id_public', $request->validated('pharmacie'))->firstOrFail();
        $pharmacie->membres()->syncWithoutDetaching([$compte->id]);

        return ApiResponse::ok(['compte' => $compte->id_public, 'pharmacies' => $this->rattachements->pharmaciesDuCompte($compte->id)]);
    }

    public function detacher(RattacherPharmacieRequest $request, User $compte): JsonResponse
    {
        $pharmacie = Pharmacie::query()->where('id_public', $request->validated('pharmacie'))->firstOrFail();
        $pharmacie->membres()->detach($compte->id);

        return ApiResponse::ok(['compte' => $compte->id_public, 'pharmacies' => $this->rattachements->pharmaciesDuCompte($compte->id)]);
    }
}
