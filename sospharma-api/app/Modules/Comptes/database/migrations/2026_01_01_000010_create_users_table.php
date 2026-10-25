<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Comptes de l'équipe et des pharmaciens : table « users » de Laravel enrichie
 * (le document d'architecture l'appelle « comptes »).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->string('nom', 150);
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['admin', 'editeur_ville', 'pharmacien']);
            // Pas de clé étrangère : Comptes ne dépend d'aucun module (voir README, Décisions).
            $table->unsignedBigInteger('ville_id')->nullable()->index();
            $table->boolean('actif')->default(true);
            $table->timestamp('derniere_connexion_le')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->index(['role', 'actif']);
        });

        Schema::create('password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
