<?php

declare(strict_types=1);

namespace App\Modules\Releves;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\FournisseurModule;
use App\Commun\Http\ApiResponse;
use App\Commun\Http\AppareilCourant;
use App\Modules\Releves\Models\Releve;
use App\Modules\Releves\Policies\RelevePolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Module Relevés : relevés terrain des agents, propositions des usagers, photos, doublons, validation.
 * Dépend de Territoire (ville depuis la position) et de Pharmacies, uniquement par son contrat EditionFichesPharmacies.
 */
class RelevesServiceProvider extends FournisseurModule
{
    protected function demarrer(): void
    {
        Gate::policy(Releve::class, RelevePolicy::class);

        // Limites lues à chaque requête (et non au démarrage) : modifiables par la configuration.
        RateLimiter::for('releves', function (Request $request): Limit {
            $parJour = (int) config('sospharma.limites.releves_par_jour', 200);

            return Limit::perDay($parJour)
                ->by('releves|'.($request->user()?->getAuthIdentifier() ?? $request->ip()))
                ->response(fn (Request $request, array $entetes) => ApiResponse::error(
                    CodeErreur::TooManyRequests,
                    "Vous avez atteint la limite de {$parJour} relevés par jour. Les relevés restent dans la file du téléphone : réessayez demain.",
                    null,
                    429,
                    $entetes,
                ));
        });

        RateLimiter::for('releves-photos', fn (Request $request): Limit => Limit::perDay((int) config('sospharma.limites.photos_releves_par_jour', 1000))
            ->by('releves-photos|'.($request->user()?->getAuthIdentifier() ?? $request->ip()))
            ->response(fn (Request $request, array $entetes) => ApiResponse::error(
                CodeErreur::TooManyRequests,
                'Trop de photos envoyées aujourd\'hui. Réessayez demain.',
                null,
                429,
                $entetes,
            )));

        // Propositions des usagers : par appareil, avec un garde-fou par adresse IP.
        RateLimiter::for('propositions', function (Request $request): array {
            $parJour = (int) config('sospharma.limites.propositions_par_jour', 3);
            $reponse = fn (Request $request, array $entetes) => ApiResponse::error(
                CodeErreur::TooManyRequests,
                "Vous avez atteint la limite de {$parJour} propositions par jour. Merci pour votre aide, réessayez demain.",
                null,
                429,
                $entetes,
            );

            return [
                Limit::perDay($parJour)->by('propositions|'.AppareilCourant::cleLimiteur($request))->response($reponse),
                Limit::perDay((int) config('sospharma.limites.propositions_par_ip', 10))->by('propositions|ip:'.$request->ip())->response($reponse),
            ];
        });

        RateLimiter::for('propositions-photos', fn (Request $request): Limit => Limit::perDay((int) config('sospharma.limites.photos_propositions_par_jour', 10))
            ->by('propositions-photos|'.AppareilCourant::cleLimiteur($request))
            ->response(fn (Request $request, array $entetes) => ApiResponse::error(
                CodeErreur::TooManyRequests,
                'Trop de photos envoyées aujourd\'hui. Réessayez demain.',
                null,
                429,
                $entetes,
            )));
    }
}
