<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Identifiant OpenStreetMap (« n123 » nœud, « w456 » chemin) : l'import peut être relancé sans doublon. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacies', function (Blueprint $table): void {
            $table->string('osm_id', 30)->nullable()->unique()->after('id_public')->comment('Élément OpenStreetMap importé');
        });
    }

    public function down(): void
    {
        Schema::table('pharmacies', function (Blueprint $table): void {
            $table->dropUnique(['osm_id']);
            $table->dropColumn('osm_id');
        });
    }
};
