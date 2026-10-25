<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Une ligne par assurance acceptée par une pharmacie (plusieurs par pharmacie). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pharmacie_assurances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('pharmacie_id')->constrained('pharmacies')->cascadeOnDelete();
            $table->foreignId('assurance_id')->constrained('assurances')->restrictOnDelete();
            $table->boolean('tiers_payant')->default(false);
            $table->string('remarque', 255)->nullable();
            $table->timestamp('verifiee_le')->nullable();
            $table->timestamps();

            $table->unique(['pharmacie_id', 'assurance_id']);
            // filter[assurances] : pharmacies qui acceptent au moins une des assurances choisies.
            $table->index(['assurance_id', 'pharmacie_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pharmacie_assurances');
    }
};
