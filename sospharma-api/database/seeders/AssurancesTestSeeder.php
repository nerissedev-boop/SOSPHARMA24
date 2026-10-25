<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Pays;
use Illuminate\Database\Seeder;

/**
 * Données de TEST : mutuelles et assureurs privés FICTIFS (noms entre crochets, aucun assureur réel),
 * puis des liens « aléatoires » mais stables entre les pharmacies de test et les assurances :
 * le tirage dépend seulement des identifiants (crc32), donc chaque seed redonne les mêmes liens.
 */
class AssurancesTestSeeder extends Seeder
{
    /** slug => [nom, type, identifiant public lisible] */
    private const FICTIVES = [
        'mutuelle-fictive-a' => ['[Mutuelle fictive A]', TypeAssurance::Mutuelle, 'as_test_muta'],
        'mutuelle-fictive-b' => ['[Mutuelle fictive B]', TypeAssurance::Mutuelle, 'as_test_mutb'],
        'assureur-prive-a' => ['[Assureur privé A]', TypeAssurance::Privee, 'as_test_priva'],
        'assureur-prive-b' => ['[Assureur privé B]', TypeAssurance::Privee, 'as_test_privb'],
        'assureur-prive-c' => ['[Assureur privé C]', TypeAssurance::Privee, 'as_test_privc'],
    ];

    /** Probabilité (en %) qu'une pharmacie de test accepte l'assurance. */
    private const TAUX = ['cmu' => 75, 'mugef-ci' => 55];

    private const TAUX_PAR_DEFAUT = 30;

    public function run(): void
    {
        $this->call(AssurancesReferentielSeeder::class);
        $pays = Pays::query()->where('code', 'CI')->firstOrFail();

        foreach (self::FICTIVES as $slug => [$nom, $type, $idPublic]) {
            Assurance::query()->updateOrCreate(['pays_id' => $pays->id, 'slug' => $slug], [
                'id_public' => $idPublic,
                'nom' => $nom,
                'type' => $type,
                'actif' => true,
            ]);
        }

        $assurances = Assurance::query()->where('pays_id', $pays->id)->orderBy('slug')->get();
        Pharmacie::query()->where('id_public', 'like', 'ph\_test%')->orderBy('id_public')->each(function (Pharmacie $pharmacie) use ($assurances): void {
            $liens = [];
            foreach ($assurances as $assurance) {
                $tirage = crc32($pharmacie->id_public.'|'.$assurance->slug) % 100;
                if ($tirage < (self::TAUX[$assurance->slug] ?? self::TAUX_PAR_DEFAUT)) {
                    $liens[$assurance->id] = [
                        'tiers_payant' => crc32($assurance->slug.'|tiers-payant|'.$pharmacie->id_public) % 2 === 0,
                        'remarque' => null,
                        'verifiee_le' => $pharmacie->verifiee_le,
                    ];
                }
            }
            $pharmacie->assurances()->sync($liens);
        });
    }
}
