<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favoris', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('appareil_id')->constrained('appareils')->cascadeOnDelete();
            $table->foreignId('pharmacie_id')->constrained('pharmacies')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['appareil_id', 'pharmacie_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favoris');
    }
};
