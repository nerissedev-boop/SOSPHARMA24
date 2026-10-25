<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pharmacies', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            // ville_id est dénormalisé (déductible de la zone) pour filtrer vite par ville.
            $table->foreignId('ville_id')->constrained('villes')->restrictOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('zones')->nullOnDelete();
            $table->string('nom', 150);
            $table->string('adresse', 255);
            $table->string('quartier', 100)->nullable();
            $table->string('telephone', 20)->nullable()->comment('Format international E.164, ex. +2250000000101');
            $table->string('whatsapp', 20)->nullable();
            $table->decimal('latitude', 9, 6);
            $table->decimal('longitude', 9, 6);
            $table->boolean('h24')->default(false)->comment('Ouverte 24h/24');
            $table->json('services')->nullable();
            $table->json('assurances')->nullable();
            $table->timestamp('verifiee_le')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            // Rectangle autour de l'usager.
            $table->index(['latitude', 'longitude'], 'pharmacies_position_index');
            $table->index(['ville_id', 'actif']);
            $table->index('nom');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pharmacies');
    }
};
