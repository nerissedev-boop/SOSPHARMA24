<?php

declare(strict_types=1);

namespace App\Modules\Comptes;

use App\Commun\FournisseurModule;
use App\Modules\Comptes\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class ComptesServiceProvider extends FournisseurModule
{
    protected function demarrer(): void
    {
        Route::model('compte', User::class);

        // Connexion : 5 essais par minute pour un même e-mail et une même adresse IP.
        RateLimiter::for('connexion', fn (Request $request): Limit => Limit::perMinute((int) config('sospharma.limites.connexions_par_minute', 5))
            ->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip()));

        // Le lien de réinitialisation ouvre le back-office Angular, pas une page Laravel.
        ResetPassword::createUrlUsing(fn (User $compte, string $jeton): string => rtrim((string) config('sospharma.admin_url'), '/')
            .'/reinitialiser-mot-de-passe?token='.urlencode($jeton).'&email='.urlencode($compte->email));
    }
}
