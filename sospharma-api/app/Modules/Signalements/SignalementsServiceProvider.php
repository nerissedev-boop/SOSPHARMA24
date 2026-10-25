<?php

declare(strict_types=1);

namespace App\Modules\Signalements;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\FournisseurModule;
use App\Commun\Http\ApiResponse;
use App\Commun\Http\AppareilCourant;
use App\Modules\Signalements\Models\Signalement;
use App\Modules\Signalements\Policies\SignalementPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;

class SignalementsServiceProvider extends FournisseurModule
{
    protected function demarrer(): void
    {
        Gate::policy(Signalement::class, SignalementPolicy::class);

        $parJour = (int) config('sospharma.limites.signalements_par_jour', 5);
        $reponse = fn (Request $request, array $entetes) => ApiResponse::error(
            CodeErreur::TooManyRequests,
            "Vous avez atteint la limite de {$parJour} signalements par jour. Réessayez demain.",
            null,
            429,
            $entetes,
        );

        RateLimiter::for('signalements', fn (Request $request): array => [
            Limit::perDay($parJour)->by('signalements|'.AppareilCourant::cleLimiteur($request))->response($reponse),
            // Garde-fou par adresse IP (plusieurs appareils derrière une même box restent possibles).
            Limit::perDay($parJour * 4)->by('signalements|ip:'.$request->ip())->response($reponse),
        ]);
    }
}
