<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Une proposition d'agent terrain, ou d'usager anonyme (origine « public », depuis l'app sans compte) :
 * rien n'est publié avant la validation par l'équipe.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('releves', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            // Identifiant généré par le téléphone (UUID) : un renvoi depuis la file hors ligne ne crée pas de doublon.
            $table->string('identifiant_client', 64);
            $table->enum('origine', ['agent', 'public'])->default('agent');
            // Agent terrain (origine « agent ») ou appareil anonyme (origine « public ») : l'un des deux.
            $table->foreignId('agent_id')->nullable()->constrained('users')->restrictOnDelete();
            // Pas de clé étrangère : la table appareils appartient au module Notifications (comme pour les signalements).
            $table->unsignedBigInteger('appareil_id')->nullable();
            $table->foreignId('ville_id')->constrained('villes')->restrictOnDelete();
            // Pharmacie mise à jour, ou créée à la validation d'un relevé de création.
            $table->foreignId('pharmacie_id')->nullable()->constrained('pharmacies')->nullOnDelete();
            $table->enum('type', ['creation', 'mise_a_jour']);
            $table->decimal('latitude', 9, 6);
            $table->decimal('longitude', 9, 6);
            $table->decimal('precision_m', 5, 1)->comment('Précision GPS annoncée par le téléphone, 30 m au plus');
            $table->unsignedInteger('ajustement_m')->nullable()->comment('Écart entre la position GPS et le repère ajusté à la main');
            $table->json('champs')->comment('Champs proposés par l\'agent');
            $table->json('corrections')->nullable()->comment('Champs corrigés par l\'équipe au moment de la validation');
            $table->json('doublons_ecartes')->nullable()->comment('Proposition d\'usager : pharmacies proches vues et écartées avant l\'envoi (ph_…)');
            $table->json('fiche_avant')->nullable()->comment('Fiche avant validation (mise à jour), pour l\'historique avant/après');
            $table->enum('statut', ['envoye', 'valide', 'a_corriger', 'rejete'])->default('envoye');
            $table->text('commentaire')->nullable()->comment('Commentaire de correction ou raison du rejet');
            $table->dateTime('releve_le')->comment('Heure du téléphone au moment du relevé (UTC)');
            $table->dateTime('recu_le')->comment('Réception (ou dernière correction) par l\'API');
            $table->foreignId('traite_par')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('traite_le')->nullable();
            $table->timestamps();

            $table->unique(['agent_id', 'identifiant_client']);
            $table->unique(['appareil_id', 'identifiant_client']);
            $table->index(['appareil_id', 'statut']);
            $table->index(['origine', 'statut', 'recu_le']);
            $table->index(['ville_id', 'statut', 'recu_le']);
            $table->index(['agent_id', 'statut']);
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('releves');
    }
};
