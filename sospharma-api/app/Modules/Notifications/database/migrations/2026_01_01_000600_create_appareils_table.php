<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Téléphones de l'app, sans compte : identifiant anonyme, jeton d'appareil (haché) et jeton Expo. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appareils', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->string('identifiant_anonyme', 100)->unique()->comment('UUID généré par l\'app');
            $table->char('jeton_hash', 64)->unique()->comment('SHA-256 du jeton X-Device-Token');
            $table->string('jeton_expo')->nullable()->comment('ExponentPushToken[…], null si refusé ou désactivé');
            $table->enum('plateforme', ['ios', 'android'])->nullable();
            $table->foreignId('ville_id')->nullable()->constrained('villes')->nullOnDelete()->comment('Ville suivie');
            $table->foreignId('zone_id')->nullable()->constrained('zones')->nullOnDelete()->comment('Commune par défaut');
            $table->boolean('notification_garde')->default(true);
            $table->boolean('actif')->default(true);
            $table->dateTime('derniere_activite_le')->nullable();
            $table->timestamps();

            $table->index(['ville_id', 'notification_garde', 'actif']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appareils');
    }
};
