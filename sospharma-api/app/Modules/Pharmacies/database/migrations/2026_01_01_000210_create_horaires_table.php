<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horaires', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('pharmacie_id')->constrained('pharmacies')->cascadeOnDelete();
            $table->unsignedTinyInteger('jour')->comment('0 = dimanche … 6 = samedi, heure locale');
            $table->time('ouverture');
            $table->time('fermeture')->comment('Avant l\'ouverture : la plage passe minuit');

            $table->index(['pharmacie_id', 'jour']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horaires');
    }
};
