<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pays', function (Blueprint $table): void {
            $table->id();
            $table->char('code', 2)->unique()->comment('Code ISO 3166-1 alpha-2, ex. CI');
            $table->string('nom', 100);
            $table->string('indicatif', 6)->comment('Ex. +225');
            $table->string('fuseau', 64)->comment('Fuseau IANA, ex. Africa/Abidjan');
            $table->char('devise', 3)->comment('Code ISO 4217, ex. XOF');
            $table->json('urgences')->comment('Liste [{service, libelle, numero}]');
            $table->json('langues')->nullable();
            $table->enum('statut', ['ouvert', 'bientot'])->default('bientot');
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pays');
    }
};
