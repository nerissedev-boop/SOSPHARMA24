<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Territoire\Models\Pays;
use Illuminate\Database\Seeder;

/**
 * Régimes publics de Côte d'Ivoire : CMU et MUGEF-CI. Ce sont de vraies données de référence :
 * ce seeder peut être lancé seul en production (php artisan db:seed --class=AssurancesReferentielSeeder --force).
 * Les mutuelles et assureurs privés réels sont à saisir par l'équipe dans le back-office.
 */
class AssurancesReferentielSeeder extends Seeder
{
    /** slug => [nom, type] */
    public const REGIMES_PUBLICS_CI = [
        'cmu' => ['CMU', TypeAssurance::Publique],
        'mugef-ci' => ['MUGEF-CI', TypeAssurance::Publique],
    ];

    public function run(): void
    {
        $pays = Pays::query()->where('code', 'CI')->first();
        if ($pays === null) {
            $this->command?->warn('Pays CI absent : lancez d\'abord TerritoireSeeder (ou créez le pays).');

            return;
        }

        foreach (self::REGIMES_PUBLICS_CI as $slug => [$nom, $type]) {
            Assurance::query()->updateOrCreate(['pays_id' => $pays->id, 'slug' => $slug], [
                'id_public' => 'as_'.str_replace('-', '', $slug),
                'nom' => $nom,
                'type' => $type,
                'actif' => true,
            ]);
        }
    }
}
