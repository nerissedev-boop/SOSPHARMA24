<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * « Mes assurances » d'un appareil (usager sans compte), pour accepte_mes_assurances.
 * Table du module Pharmacies (propriétaire du référentiel) ; l'appareil appartient à Notifications,
 * d'où une simple colonne indexée, sans clé étrangère entre modules (README, décision 4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appareil_assurances', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('appareil_id');
            $table->foreignId('assurance_id')->constrained('assurances')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['appareil_id', 'assurance_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appareil_assurances');
    }
};
