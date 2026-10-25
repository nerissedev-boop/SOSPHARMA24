<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Historique et file des envois Expo Push (absent du modèle de données du document,
 * nécessaire à GET /admin/notifications/envois et aux nouveaux essais).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('envois_notification', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->string('type', 30)->comment('tour_garde, test');
            $table->foreignId('ville_id')->nullable()->constrained('villes')->nullOnDelete();
            $table->string('reference', 30)->nullable()->comment('Ex. identifiant public du tour de garde');
            $table->string('titre', 150);
            $table->json('contenu')->nullable();
            $table->enum('statut', ['en_attente', 'en_cours', 'envoye', 'echec'])->default('en_attente');
            $table->dateTime('programme_le')->comment('UTC');
            $table->dateTime('envoye_le')->nullable();
            $table->unsignedInteger('destinataires')->default(0);
            $table->unsignedInteger('echecs')->default(0);
            $table->unsignedTinyInteger('tentatives')->default(0);
            $table->unsignedBigInteger('curseur_appareil_id')->nullable()->comment('Reprise après une panne en cours d\'envoi');
            $table->text('derniere_erreur')->nullable();
            $table->timestamps();

            $table->index(['statut', 'programme_le']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('envois_notification');
    }
};
