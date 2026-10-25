<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Services;

use App\Commun\Erreurs\ActionInterdite;
use App\Commun\Erreurs\DonneesInvalides;
use App\Modules\Comptes\Exceptions\IdentifiantsIncorrects;
use App\Modules\Comptes\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Throwable;

final class Authentification
{
    /** @return array{jeton: string, compte: User} */
    public function connecter(string $email, string $motDePasse, string $nomAppareil = 'back-office'): array
    {
        $compte = User::query()->where('email', mb_strtolower(trim($email)))->first();

        if ($compte === null) {
            // Même coût qu'une vérification réelle : le temps de réponse ne révèle pas l'existence du compte.
            Hash::make($motDePasse);

            throw new IdentifiantsIncorrects;
        }
        if (! Hash::check($motDePasse, $compte->password)) {
            throw new IdentifiantsIncorrects;
        }
        if (! $compte->actif) {
            throw new ActionInterdite('Ce compte est désactivé. Contactez l\'équipe SOS Pharma 24.');
        }

        $compte->forceFill(['derniere_connexion_le' => now()])->save();

        return ['jeton' => $compte->createToken($nomAppareil)->plainTextToken, 'compte' => $compte];
    }

    public function deconnecter(User $compte): void
    {
        $compte->currentAccessToken()?->delete();
    }

    /** Envoie le lien si le compte existe ; la réponse est la même dans tous les cas. */
    public function envoyerLienReinitialisation(string $email): void
    {
        try {
            Password::broker()->sendResetLink(['email' => mb_strtolower(trim($email))]);
        } catch (Throwable $e) {
            // Service de messagerie externe : on journalise et on répond quand même (pas d'information sur le compte).
            Log::error('Envoi du lien de réinitialisation impossible', ['erreur' => $e->getMessage()]);
        }
    }

    public function reinitialiser(string $email, string $jeton, string $motDePasse): void
    {
        $statut = Password::broker()->reset(
            ['email' => mb_strtolower(trim($email)), 'token' => $jeton, 'password' => $motDePasse],
            function (User $compte, string $nouveau): void {
                $compte->forceFill(['password' => $nouveau])->save();
                $compte->tokens()->delete();
            },
        );

        if ($statut !== Password::PASSWORD_RESET) {
            throw new DonneesInvalides('Ce lien est invalide ou a expiré.', ['token' => ['Lien invalide ou expiré.']]);
        }
    }
}
