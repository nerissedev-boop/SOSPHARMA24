<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zones', function (Blueprint $table): void {
            $table->id();
            $table->string('id_public', 20)->unique();
            $table->foreignId('ville_id')->constrained('villes')->restrictOnDelete();
            $table->string('nom', 100);
            $table->enum('type', ['commune', 'quartier'])->default('commune');
            $table->json('contour')->comment('Géométrie GeoJSON Polygon ou MultiPolygon, [lng, lat]');
            $table->string('contour_source', 150)->nullable()->comment('Origine du contour, ex. « fictif simplifié (test) »');
            $table->decimal('bbox_min_lat', 9, 6);
            $table->decimal('bbox_max_lat', 9, 6);
            $table->decimal('bbox_min_lng', 9, 6);
            $table->decimal('bbox_max_lng', 9, 6);
            $table->decimal('centre_lat', 9, 6);
            $table->decimal('centre_lng', 9, 6);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['ville_id', 'type', 'nom']);
            // Présélection des communes candidates pour un point.
            $table->index(['bbox_min_lat', 'bbox_max_lat', 'bbox_min_lng', 'bbox_max_lng'], 'zones_bbox_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
