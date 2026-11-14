<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plusieurs numéros par pharmacie (la liste de l'Ordre en donne jusqu'à quatre).
 * pharmacies.telephone et pharmacies.whatsapp restent, recopiés du rang 1 et du premier numéro WhatsApp.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telephones_pharmacie', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('pharmacie_id')->constrained('pharmacies')->cascadeOnDelete();
            $table->string('numero', 20)->comment('Format international E.164, ex. +2250707123456');
            $table->unsignedSmallInteger('rang')->comment('1 = numéro principal');
            $table->boolean('whatsapp')->default(false);
            $table->timestamp('whatsapp_confirme_le')->nullable();
            $table->foreignId('whatsapp_confirme_par')->nullable()->constrained('users')->nullOnDelete();
            $table->string('origine', 20)->comment('import, liste_garde, osm, agent, admin, pharmacien, reprise');
            $table->timestamps();

            $table->unique(['pharmacie_id', 'numero']);
            // Rapprochement d'une liste ou d'un fichier par le numéro.
            $table->index('numero');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telephones_pharmacie');
    }
};
