<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Http\Controllers;

use App\Commun\Contrats\AnnuaireTerritoire;
use App\Commun\Http\ApiResponse;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\Role;
use App\Http\Controllers\Controller;
use App\Modules\Comptes\Http\Requests\EnregistrerCompteRequest;
use App\Modules\Comptes\Http\Resources\CompteResource;
use App\Modules\Comptes\Models\User;
use App\Modules\Comptes\Services\GestionComptes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Gestion des comptes (admin uniquement, imposé par le middleware de route). */
class AdminCompteController extends Controller
{
    public function __construct(private readonly GestionComptes $gestion) {}

    public function index(Request $request, AnnuaireTerritoire $territoire): JsonResponse
    {
        $p = ParametresListe::depuis($request, ['role', 'ville', 'actif'], ['nom' => 'nom', 'cree_le' => 'created_at'], true, ['nom', 'asc']);
        $role = $p->filtreParmi('role', array_column(Role::cases(), 'value'));
        $villeId = $p->filtre('ville') !== null ? ($territoire->villeIdDepuisPublic($p->filtre('ville')) ?? 0) : null;

        $requete = User::query()
            ->when($role !== null, fn ($r) => $r->where('role', $role))
            ->when($villeId !== null, fn ($r) => $r->where(fn ($s) => $s->where('ville_id', $villeId)
                ->orWhereIn('id', fn ($q) => $q->select('user_id')->from('compte_villes')->where('ville_id', $villeId))))
            ->when($p->filtreBooleen('actif') !== null, fn ($r) => $r->where('actif', $p->filtreBooleen('actif')))
            ->when($p->q !== null, function ($r) use ($p): void {
                $motif = '%'.addcslashes((string) $p->q, '%_\\').'%';
                $r->where(fn ($s) => $s->where('nom', 'like', $motif)->orWhere('email', 'like', $motif));
            });

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), CompteResource::class);
    }

    public function store(EnregistrerCompteRequest $request): JsonResponse
    {
        return ApiResponse::created(new CompteResource($this->gestion->inviter($request->validated())));
    }

    public function update(EnregistrerCompteRequest $request, User $compte): JsonResponse
    {
        /** @var User $auteur */
        $auteur = $request->user();

        return ApiResponse::ok(new CompteResource($this->gestion->modifier($compte, $request->validated(), $auteur)));
    }

    public function destroy(Request $request, User $compte): JsonResponse
    {
        /** @var User $auteur */
        $auteur = $request->user();

        return ApiResponse::ok(new CompteResource($this->gestion->desactiver($compte, $auteur)));
    }
}
