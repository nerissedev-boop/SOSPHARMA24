<?php

declare(strict_types=1);

namespace App\Modules\Gardes;

use App\Commun\FournisseurModule;
use App\Modules\Gardes\Console\AnalyserListeGarde;
use App\Modules\Gardes\Console\ImporterListeGarde;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Gardes\Policies\GardePolicy;
use App\Modules\Gardes\Policies\TourGardePolicy;
use App\Modules\Gardes\Services\SourceGardesPubliees;
use App\Modules\Pharmacies\Contrats\SourcePeriodesGarde;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;

class GardesServiceProvider extends FournisseurModule
{
    public function register(): void
    {
        // La règle de statut (Pharmacies) lit les gardes publiées par ce module.
        $this->app->bind(SourcePeriodesGarde::class, SourceGardesPubliees::class);
    }

    protected function demarrer(): void
    {
        Route::model('tour', TourGarde::class);
        Gate::policy(TourGarde::class, TourGardePolicy::class);
        Gate::policy(Garde::class, GardePolicy::class);

        if ($this->app->runningInConsole()) {
            $this->commands([AnalyserListeGarde::class, ImporterListeGarde::class]);
        }
    }
}
