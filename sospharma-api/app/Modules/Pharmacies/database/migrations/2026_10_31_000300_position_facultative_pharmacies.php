<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Position facultative : une pharmacie de la liste de garde absente d'OpenStreetMap est publiée
 * avec son téléphone et son repère, « position à confirmer », en attendant un relevé terrain.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacies', function (Blueprint $table): void {
            $table->decimal('latitude', 9, 6)->nullable()->change();
            $table->decimal('longitude', 9, 6)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('pharmacies', function (Blueprint $table): void {
            $table->decimal('latitude', 9, 6)->nullable(false)->change();
            $table->decimal('longitude', 9, 6)->nullable(false)->change();
        });
    }
};
