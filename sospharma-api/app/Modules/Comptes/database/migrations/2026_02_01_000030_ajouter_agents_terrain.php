<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rôle agent_terrain (module Relevés) : la colonne users.role devient une chaîne
 * (les valeurs sont contrôlées par l'enum PHP App\Commun\Securite\Role), et un agent
 * est rattaché à une ou plusieurs villes par la table compte_villes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Une énumération SQL demanderait une migration à chaque nouveau rôle.
            $table->string('role', 30)->change();
        });

        Schema::create('compte_villes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // Pas de clé étrangère vers villes : Comptes ne dépend d'aucun module (comme users.ville_id).
            $table->unsignedBigInteger('ville_id')->index();
            $table->timestamps();

            $table->unique(['user_id', 'ville_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compte_villes');

        Schema::table('users', function (Blueprint $table): void {
            $table->enum('role', ['admin', 'editeur_ville', 'pharmacien'])->change();
        });
    }
};
