<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('villes', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('pays_id')->constrained('pays')->restrictOnDelete();
            $table->string('nom', 100);
            $table->enum('statut', ['ouverte', 'bientot'])->default('bientot');
            $table->decimal('latitude', 9, 6);
            $table->decimal('longitude', 9, 6);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['pays_id', 'nom']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('villes');
    }
};
