<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies;

use App\Commun\Contrats\RattachementsCompte;
use App\Commun\FournisseurModule;
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
use Illuminate\Support\Facades\Gate;

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
    }
}
