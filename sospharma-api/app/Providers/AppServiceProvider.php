<?php

declare(strict_types=1);

namespace App\Providers;

use App\Commun\Documentation\EnveloppeApi;
use App\Commun\Securite\CompteAvecRole;
use App\Console\Commands\SauvegarderBase;
use Dedoc\Scramble\Scramble;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Limite générale de l'API (groupe « api ») : par compte connecté, sinon par adresse IP.
        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute((int) config('sospharma.limites.api_par_minute', 120))
            ->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip())));

        // Documentation /docs/api : comptes admin seulement (hors environnement local).
        Gate::define('viewApiDocs', fn (?CompteAvecRole $compte = null): bool => $compte !== null && $compte->estAdmin() && $compte->estActif());

        if (class_exists(Scramble::class)) {
            Scramble::configure()->withDocumentTransformers(EnveloppeApi::class);
        }

        if ($this->app->runningInConsole()) {
            $this->commands([SauvegarderBase::class]);
        }
    }
}
