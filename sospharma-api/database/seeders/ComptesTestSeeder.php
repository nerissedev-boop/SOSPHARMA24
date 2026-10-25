<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Commun\Securite\Role;
use App\Modules\Comptes\Models\User;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Database\Seeder;
use RuntimeException;

/** Comptes de test. Le mot de passe vient de SEED_MOT_DE_PASSE (.env), jamais du code. */
class ComptesTestSeeder extends Seeder
{
    public function run(): void
    {
        $motDePasse = config('sospharma.seed.mot_de_passe');
        if (! is_string($motDePasse) || mb_strlen($motDePasse) < 10) {
            throw new RuntimeException('Définissez SEED_MOT_DE_PASSE (10 caractères au moins) dans le fichier .env.');
        }
        $abidjan = Ville::query()->where('id_public', 'vi_abj')->firstOrFail();

        User::query()->updateOrCreate(['email' => (string) config('sospharma.seed.admin_email')], [
            'nom' => 'Admin de test', 'password' => $motDePasse, 'role' => Role::Admin, 'ville_id' => null, 'actif' => true,
        ]);

        User::query()->updateOrCreate(['email' => 'editeur.abidjan@sospharma.test'], [
            'nom' => 'Éditeur Abidjan (test)', 'password' => $motDePasse, 'role' => Role::EditeurVille, 'ville_id' => $abidjan->id, 'actif' => true,
        ]);

        $pharmacien = User::query()->updateOrCreate(['email' => 'pharmacien.test01@sospharma.test'], [
            'nom' => 'Pharmacien de test', 'password' => $motDePasse, 'role' => Role::Pharmacien, 'ville_id' => null, 'actif' => true,
        ]);
        Pharmacie::query()->where('id_public', 'ph_test01')->firstOrFail()->membres()->syncWithoutDetaching([$pharmacien->id]);

        $agent = User::query()->updateOrCreate(['email' => 'agent.abidjan@sospharma.test'], [
            'nom' => 'Agent terrain Abidjan (test)', 'password' => $motDePasse, 'role' => Role::AgentTerrain, 'ville_id' => null, 'actif' => true,
        ]);
        $agent->synchroniserVilles([$abidjan->id]);
    }
}
