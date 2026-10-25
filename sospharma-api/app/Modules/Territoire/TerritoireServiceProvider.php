<?php

declare(strict_types=1);

namespace App\Modules\Territoire;

use App\Commun\Contrats\AnnuaireTerritoire;
use App\Commun\FournisseurModule;
use App\Modules\Territoire\Contrats\CompteurZones;
use App\Modules\Territoire\Models\Zone;
use App\Modules\Territoire\Policies\ZonePolicy;
use App\Modules\Territoire\Services\AnnuaireTerritoireEloquent;
use App\Modules\Territoire\Services\CompteursVides;
use App\Modules\Territoire\Services\ConfigurationPays;
use Illuminate\Support\Facades\Gate;

class TerritoireServiceProvider extends FournisseurModule
{
    public function register(): void
    {
        $this->app->singleton(ConfigurationPays::class);
        $this->app->bind(AnnuaireTerritoire::class, AnnuaireTerritoireEloquent::class);
        // Remplacé par le module Pharmacies s'il est chargé.
        $this->app->bindIf(CompteurZones::class, CompteursVides::class);
    }

    protected function demarrer(): void
    {
        Gate::policy(Zone::class, ZonePolicy::class);
    }
}
