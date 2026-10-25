<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Photos d'un relevé, privées (storage/app/private/releves) tant qu'elles ne sont pas validées. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('releves_photos', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('releve_id')->constrained('releves')->cascadeOnDelete();
            $table->enum('type', ['facade', 'enseigne', 'horaires']);
            $table->string('chemin', 255)->comment('Chemin privé sur le disque local');
            $table->string('mime', 50);
            $table->unsignedInteger('taille_octets');
            $table->unsignedSmallInteger('largeur');
            $table->unsignedSmallInteger('hauteur');
            $table->boolean('metadonnees_supprimees')->default(false)->comment('EXIF (dont la position) retiré par réencodage');
            $table->boolean('publiee')->default(false);
            $table->string('chemin_public', 255)->nullable()->comment('Copie publique après validation (façade)');
            $table->timestamps();

            // Une photo par type : un nouvel envoi du même type remplace la précédente.
            $table->unique(['releve_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('releves_photos');
    }
};
