<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('secteurs_garde', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('ville_id')->constrained('villes')->restrictOnDelete();
            $table->string('nom', 100);
            $table->json('contour')->nullable();
            $table->decimal('bbox_min_lat', 9, 6)->nullable();
            $table->decimal('bbox_max_lat', 9, 6)->nullable();
            $table->decimal('bbox_min_lng', 9, 6)->nullable();
            $table->decimal('bbox_max_lng', 9, 6)->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['ville_id', 'nom']);
            $table->index(['bbox_min_lat', 'bbox_max_lat', 'bbox_min_lng', 'bbox_max_lng'], 'secteurs_garde_bbox_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('secteurs_garde');
    }
};
