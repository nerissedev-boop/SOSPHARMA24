<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Référentiel des assureurs et mutuelles d'un pays, géré par l'équipe. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assurances', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('pays_id')->constrained('pays')->restrictOnDelete();
            $table->string('nom', 150);
            // Utilisé dans filter[assurances]=cmu,mugef-ci : stable, unique dans un pays.
            $table->string('slug', 80);
            $table->enum('type', ['publique', 'mutuelle', 'privee']);
            $table->string('logo', 255)->nullable()->comment('Chemin sur le disque public ou URL absolue');
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['pays_id', 'slug']);
            $table->index(['pays_id', 'actif', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assurances');
    }
};
