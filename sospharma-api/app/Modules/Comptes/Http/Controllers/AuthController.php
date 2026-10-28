<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Modules\Comptes\Http\Requests\ConnexionRequest;
use App\Modules\Comptes\Http\Requests\OubliMotDePasseRequest;
use App\Modules\Comptes\Http\Requests\ReinitialiserMotDePasseRequest;
use App\Modules\Comptes\Http\Resources\CompteResource;
use App\Modules\Comptes\Models\User;
use App\Modules\Comptes\Services\Authentification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly Authentification $auth) {}

    public function connexion(ConnexionRequest $request): JsonResponse
    {
        $resultat = $this->auth->connecter(
            $request->validated('email'),
            $request->validated('password'),
            $request->validated('nom_appareil', 'back-office'),
        );

        return ApiResponse::ok([
            'jeton' => $resultat['jeton'],
            'type_jeton' => 'Bearer',
            'compte' => new CompteResource($resultat['compte']),
        ]);
    }

    public function deconnexion(Request $request): JsonResponse
    {
        /** @var User $compte */
        $compte = $request->user();
        $this->auth->deconnecter($compte);

        return ApiResponse::ok(null);
    }

    public function moi(Request $request): JsonResponse
    {
        return ApiResponse::ok(new CompteResource($request->user()));
    }

    public function oubli(OubliMotDePasseRequest $request): JsonResponse
    {
        $this->auth->envoyerLienReinitialisation($request->validated('email'));

        return ApiResponse::ok(['message' => __('Si un compte existe pour cet e-mail, un lien de réinitialisation vient d\'être envoyé.')]);
    }

    public function reinitialiser(ReinitialiserMotDePasseRequest $request): JsonResponse
    {
        $this->auth->reinitialiser($request->validated('email'), $request->validated('token'), $request->validated('password'));

        return ApiResponse::ok(['message' => __('Votre mot de passe a été modifié. Vous pouvez vous connecter.')]);
    }
}
