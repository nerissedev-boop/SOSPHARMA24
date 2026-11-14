<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Identifiant public « tl_… » des numéros, pour les routes …/telephones/{telephone} de l'agent et de l'équipe.
 * Les lignes déjà là (reprise, imports) reçoivent le leur ici ; les suivantes l'ont à la création (modèle).
 * La colonne reste nullable : la rendre obligatoire demanderait un ->change(), pas encore vérifié sur SQLite.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('telephones_pharmacie', function (Blueprint $table): void {
            $table->string('id_public', 20)->nullable()->unique()->after('id');
        });

        DB::table('telephones_pharmacie')->whereNull('id_public')->orderBy('id')->select('id')
            ->chunkById(500, function ($lignes): void {
                foreach ($lignes as $ligne) {
                    DB::table('telephones_pharmacie')->where('id', $ligne->id)
                        ->update(['id_public' => 'tl_'.Str::lower(Str::random(10))]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('telephones_pharmacie', function (Blueprint $table): void {
            $table->dropUnique(['id_public']);
            $table->dropColumn('id_public');
        });
    }
};
