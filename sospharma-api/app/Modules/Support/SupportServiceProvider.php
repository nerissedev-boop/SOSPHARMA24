<?php

declare(strict_types=1);

namespace App\Modules\Support;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\FournisseurModule;
use App\Commun\Http\ApiResponse;
use App\Commun\Http\AppareilCourant;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class SupportServiceProvider extends FournisseurModule
{
    protected function demarrer(): void
    {
        $parJour = (int) config('sospharma.limites.messages_par_jour', 5);
        $reponse = fn (Request $request, array $entetes) => ApiResponse::error(
            CodeErreur::TooManyRequests,
            'Vous avez envoyé beaucoup de messages aujourd\'hui. Réessayez demain.',
            null,
            429,
            $entetes,
        );

        // Messages et captures : quelques envois par jour et par appareil, avec un garde-fou par IP.
        RateLimiter::for('messages-support', fn (Request $request): array => [
            Limit::perDay($parJour * 2)->by('support|'.AppareilCourant::cleLimiteur($request))->response($reponse),
            Limit::perDay($parJour * 8)->by('support|ip:'.$request->ip())->response($reponse),
        ]);
    }
}
