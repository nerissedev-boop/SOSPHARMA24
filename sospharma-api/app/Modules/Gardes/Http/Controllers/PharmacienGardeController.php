<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Controllers;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Commun\Support\Dates;
use App\Http\Controllers\Controller;
use App\Modules\Gardes\Exceptions\GardeIntrouvable;
use App\Modules\Gardes\Http\Resources\GardeResource;
use App\Modules\Gardes\Models\Garde;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** Espace pharmacien : ses gardes (tours publiés) et leur confirmation. */
class PharmacienGardeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $p = ParametresListe::depuis($request, ['periode'], ['debut' => 'debut'], triParDefaut: ['debut', 'desc']);
        $periode = $p->filtreParmi('periode', ['a_venir', 'passees']);
        /** @var CompteAvecRole $compte */
        $compte = $request->user();
        $maintenant = Dates::maintenant()->format('Y-m-d H:i:s');

        $requete = Garde::query()->with(['tour', 'pharmacie.zone'])
            ->whereHas('tour', fn ($t) => $t->publies())
            ->whereHas('pharmacie.membres', fn ($m) => $m->where('users.id', $compte->idInterne()))
            ->when($periode === 'a_venir', fn ($r) => $r->where('fin', '>', $maintenant))
            ->when($periode === 'passees', fn ($r) => $r->where('fin', '<=', $maintenant));

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), GardeResource::class);
    }

    public function confirmer(string $garde): JsonResponse
    {
        $modele = Garde::query()->where('id_public', $garde)->whereHas('tour', fn ($t) => $t->publies())->first()
            ?? throw new GardeIntrouvable;
        Gate::authorize('confirmer', $modele);

        if ($modele->fin->lessThanOrEqualTo(Dates::maintenant())) {
            throw new DonneesInvalides('Cette garde est terminée.', ['garde' => ['Garde terminée.']]);
        }
        if ($modele->confirmee_le === null) {
            $modele->update(['confirmee_le' => now()]);
        }

        return ApiResponse::ok(new GardeResource($modele->load(['tour', 'pharmacie.zone'])));
    }
}
