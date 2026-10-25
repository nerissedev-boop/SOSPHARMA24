<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Données de TEST : Côte d'Ivoire, Abidjan et ses 13 communes (contours fictifs simplifiés),
 * 20 pharmacies fictives, leurs horaires et assurances (CMU, MUGEF-CI et assureurs FICTIFS),
 * un tour de garde en cours et des comptes de test (dont un agent terrain).
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les données de test ne doivent pas être chargées en production.');
        }

        $this->call([
            TerritoireSeeder::class,
            PharmaciesTestSeeder::class,
            AssurancesTestSeeder::class,
            ComptesTestSeeder::class,
            TourGardeTestSeeder::class,
        ]);
    }
}
