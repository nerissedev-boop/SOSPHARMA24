<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Remplace l'ancien champ texte pharmacies.assurances (JSON de noms libres) par la table pharmacie_assurances.
 * Chaque nom est rapproché du référentiel du pays par son slug ; sans correspondance, il devient une
 * proposition « en attente » (source migration) : rien n'est perdu, l'équipe tranche.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('pharmacies', 'assurances')) {
            return;
        }

        $maintenant = now();
        DB::table('pharmacies')
            ->join('villes', 'villes.id', '=', 'pharmacies.ville_id')
            ->whereNotNull('pharmacies.assurances')
            ->select(['pharmacies.id', 'pharmacies.assurances', 'villes.pays_id'])
            ->orderBy('pharmacies.id')
            ->chunk(200, function ($lignes) use ($maintenant): void {
                foreach ($lignes as $ligne) {
                    $noms = json_decode((string) $ligne->assurances, true);
                    if (! is_array($noms)) {
                        continue;
                    }
                    foreach (array_unique(array_filter(array_map(fn ($n) => is_string($n) ? trim($n) : '', $noms))) as $nom) {
                        $assuranceId = DB::table('assurances')
                            ->where('pays_id', $ligne->pays_id)
                            ->where('slug', Str::slug($nom))
                            ->value('id');
                        if ($assuranceId !== null) {
                            DB::table('pharmacie_assurances')->insertOrIgnore([
                                'pharmacie_id' => $ligne->id, 'assurance_id' => $assuranceId, 'tiers_payant' => false,
                                'created_at' => $maintenant, 'updated_at' => $maintenant,
                            ]);

                            continue;
                        }
                        DB::table('propositions_assurance')->insert([
                            'id_public' => 'pa_'.Str::lower(Str::random(10)),
                            'pays_id' => $ligne->pays_id,
                            'pharmacie_id' => $ligne->id,
                            'nom' => mb_substr($nom, 0, 150),
                            'source' => 'migration',
                            'statut' => 'en_attente',
                            'created_at' => $maintenant,
                            'updated_at' => $maintenant,
                        ]);
                    }
                }
            });

        Schema::table('pharmacies', function (Blueprint $table): void {
            $table->dropColumn('assurances');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('pharmacies', 'assurances')) {
            return;
        }

        Schema::table('pharmacies', function (Blueprint $table): void {
            $table->json('assurances')->nullable();
        });

        // Retour arrière : on remet les noms des assurances liées dans le champ texte.
        DB::table('pharmacie_assurances')
            ->join('assurances', 'assurances.id', '=', 'pharmacie_assurances.assurance_id')
            ->select(['pharmacie_assurances.pharmacie_id', 'assurances.nom'])
            ->orderBy('pharmacie_assurances.pharmacie_id')
            ->get()
            ->groupBy('pharmacie_id')
            ->each(fn ($liens, $pharmacieId) => DB::table('pharmacies')->where('id', $pharmacieId)
                ->update(['assurances' => json_encode($liens->pluck('nom')->values()->all(), JSON_UNESCAPED_UNICODE)]));
    }
};
