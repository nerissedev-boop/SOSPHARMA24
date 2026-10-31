<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies;

use App\Commun\Contrats\RattachementsCompte;
use App\Commun\FournisseurModule;
use App\Modules\Pharmacies\Console\ImporterPharmaciesOsm;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Pharmacies\Contrats\SourcePeriodesGarde;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Policies\PharmaciePolicy;
use App\Modules\Pharmacies\Services\AucuneGarde;
use App\Modules\Pharmacies\Services\CompteursParZone;
use App\Modules\Pharmacies\Services\EditionFichesEloquent;
use App\Modules\Pharmacies\Services\PharmaciesDuCompte;
use App\Modules\Pharmacies\Services\StatutPharmacie;
use App\Modules\Territoire\Contrats\CompteurZones;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;

class PharmaciesServiceProvider extends FournisseurModule
{
    public function register(): void
    {
        $this->app->singleton(StatutPharmacie::class);
        // Remplacé par le module Gardes s'il est chargé.
        $this->app->bindIf(SourcePeriodesGarde::class, AucuneGarde::class);
        $this->app->bind(CompteurZones::class, CompteursParZone::class);
        $this->app->bind(RattachementsCompte::class, PharmaciesDuCompte::class);
        // Partie publique pour le module Relevés (création et mise à jour des fiches à la validation).
        $this->app->bind(EditionFichesPharmacies::class, EditionFichesEloquent::class);
    }

    protected function demarrer(): void
    {
        Gate::policy(Pharmacie::class, PharmaciePolicy::class);

        // Temps de trajet Google, payant à l'appel : limité par appareil (sinon par adresse IP).
        RateLimiter::for('trajets', fn (Request $request): Limit => Limit::perHour((int) config('sospharma.limites.trajets_par_heure', 30))
            ->by('trajets|'.($request->header('X-Device-Token') ?: $request->ip())));

        if ($this->app->runningInConsole()) {
            $this->commands([ImporterPharmaciesOsm::class]);
        }
    }
}
