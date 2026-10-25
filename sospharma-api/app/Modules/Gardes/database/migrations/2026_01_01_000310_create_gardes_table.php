<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gardes', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('tour_garde_id')->constrained('tours_garde')->cascadeOnDelete();
            $table->foreignId('pharmacie_id')->constrained('pharmacies')->restrictOnDelete();
            // Période propre à la pharmacie (« toute la nuit » ou « jusqu'à 02:00 »), dans la période du tour.
            $table->dateTime('debut')->comment('UTC');
            $table->dateTime('fin')->comment('UTC, exclue');
            $table->dateTime('confirmee_le')->nullable()->comment('Confirmation par la pharmacie');
            $table->timestamps();

            $table->unique(['tour_garde_id', 'pharmacie_id', 'debut']);
            $table->index(['pharmacie_id', 'debut', 'fin']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gardes');
    }
};
