<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Assurance absente du référentiel, proposée en nom libre par un agent (relevé) ou un pharmacien.
 * L'équipe l'accepte (création dans le référentiel, ou rattachement à une assurance existante) ou la rejette.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('propositions_assurance', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('pays_id')->constrained('pays')->restrictOnDelete();
            $table->foreignId('pharmacie_id')->nullable()->constrained('pharmacies')->nullOnDelete();
            $table->string('nom', 150);
            $table->enum('source', ['releve', 'pharmacien', 'migration']);
            // Relevé d'origine (module Relevés, au-dessus de Pharmacies) : référence simple.
            $table->unsignedBigInteger('releve_id')->nullable()->index();
            $table->foreignId('propose_par')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('statut', ['en_attente', 'acceptee', 'rejetee'])->default('en_attente');
            $table->foreignId('assurance_id')->nullable()->constrained('assurances')->nullOnDelete()->comment('Assurance créée ou retenue à l\'acceptation');
            $table->text('commentaire')->nullable();
            $table->foreignId('traite_par')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('traite_le')->nullable();
            $table->timestamps();

            $table->index(['statut', 'pays_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('propositions_assurance');
    }
};
