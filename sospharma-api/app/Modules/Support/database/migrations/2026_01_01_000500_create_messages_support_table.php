<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages_support', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->enum('sujet', ['question', 'probleme_technique', 'donnees_pharmacie', 'suggestion', 'autre']);
            $table->text('message');
            $table->string('contact', 150)->nullable()->comment('E-mail ou téléphone, facultatif');
            $table->string('capture_chemin')->nullable()->comment('Chemin dans storage/app/private');
            $table->string('capture_type', 50)->nullable();
            // Support ne dépend d'aucun module : références simples, sans clé étrangère.
            $table->unsignedBigInteger('appareil_id')->nullable()->index();
            $table->enum('statut', ['nouveau', 'traite'])->default('nouveau');
            $table->unsignedBigInteger('traite_par')->nullable();
            $table->dateTime('traite_le')->nullable();
            $table->timestamps();

            $table->index(['statut', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages_support');
    }
};
