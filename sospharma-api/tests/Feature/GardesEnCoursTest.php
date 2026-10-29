<?php

declare(strict_types=1);

use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Support\Facades\Storage;

/*
| Tour de garde public (écran Garde de l'app, maquette « cartes arrondies ») : chaque pharmacie
| porte sa commune et sa photo de façade, pour la vignette et la 2e ligne des listes.
*/

beforeEach(function (): void {
    $this->travelTo(now()->parse('2026-10-24T20:00:00Z'));
    $this->ville = creerAbidjan();
    $cocody = Zone::query()->where('nom', 'Cocody')->sole();

    $this->avecPhoto = creerPharmacie($this->ville, ['nom' => 'Avec photo', 'zone_id' => $cocody->id, 'photo_facade' => 'pharmacies/facade-test.jpg']);
    $this->sansPhoto = creerPharmacie($this->ville, ['nom' => 'Sans photo', 'zone_id' => $cocody->id, 'latitude' => 5.36]);

    $tour = TourGarde::query()->create([
        'ville_id' => $this->ville->id, 'debut' => now()->subDay(), 'fin' => now()->addDays(6), 'statut' => StatutTour::Publie,
    ]);
    foreach ([$this->avecPhoto, $this->sansPhoto] as $pharmacie) {
        $tour->gardes()->create(['pharmacie_id' => $pharmacie->id, 'debut' => $tour->debut, 'fin' => $tour->fin]);
    }
});

it('donne la commune et la photo de façade de chaque pharmacie de garde', function (): void {
    $pharmacies = collect($this->getJson('/api/v1/gardes/en-cours?ville=vi_abj&lat=5.355&lng=-3.97')->assertOk()->json('data.pharmacies'))
        ->keyBy('nom');

    expect($pharmacies['Avec photo']['zone'])->toMatchArray(['nom' => 'Cocody'])
        ->and($pharmacies['Avec photo']['photo_facade'])->toBe(Storage::disk('public')->url('pharmacies/facade-test.jpg'))
        ->and($pharmacies['Sans photo']['zone'])->toMatchArray(['nom' => 'Cocody'])
        // null jamais omis : l'app affiche la pastille de statut à la place de la vignette.
        ->and($pharmacies['Sans photo'])->toHaveKey('photo_facade')
        ->and($pharmacies['Sans photo']['photo_facade'])->toBeNull()
        ->and($pharmacies['Avec photo'])->toHaveKey('accepte_mes_assurances');
});
