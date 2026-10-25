<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tours_garde', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('ville_id')->constrained('villes')->restrictOnDelete();
            $table->foreignId('secteur_garde_id')->nullable()->constrained('secteurs_garde')->nullOnDelete();
            $table->dateTime('debut')->comment('UTC');
            $table->dateTime('fin')->comment('UTC, exclue');
            $table->enum('statut', ['brouillon', 'publie'])->default('brouillon');
            $table->foreignId('saisi_par')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('valide_par')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('valide_le')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            // Trouver vite le tour en cours d'une ville.
            $table->index(['ville_id', 'debut', 'fin']);
            $table->index(['statut', 'actif']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tours_garde');
    }
};
