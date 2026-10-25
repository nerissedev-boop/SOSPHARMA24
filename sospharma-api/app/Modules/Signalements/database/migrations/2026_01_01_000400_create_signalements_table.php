<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signalements', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('pharmacie_id')->constrained('pharmacies')->restrictOnDelete();
            $table->enum('motif', ['fermee', 'pas_de_garde', 'mauvaise_adresse', 'mauvais_telephone', 'horaires_faux', 'autre']);
            $table->text('precisions')->nullable();
            // Appareil anonyme (module Notifications) : référence simple, sans clé étrangère entre modules.
            $table->unsignedBigInteger('appareil_id')->nullable()->index();
            $table->enum('statut', ['nouveau', 'traite', 'rejete'])->default('nouveau');
            $table->text('commentaire')->nullable()->comment('Commentaire de traitement ou raison du rejet');
            $table->foreignId('traite_par')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('traite_le')->nullable();
            $table->timestamps();

            $table->index(['statut', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signalements');
    }
};
