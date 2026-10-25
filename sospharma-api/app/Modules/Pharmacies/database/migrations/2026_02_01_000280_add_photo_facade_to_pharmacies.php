<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Photo de façade publique, issue d'un relevé terrain validé (module Relevés). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacies', function (Blueprint $table): void {
            $table->string('photo_facade', 255)->nullable()->after('services')->comment('Chemin sur le disque public');
        });
    }

    public function down(): void
    {
        Schema::table('pharmacies', function (Blueprint $table): void {
            $table->dropColumn('photo_facade');
        });
    }
};
