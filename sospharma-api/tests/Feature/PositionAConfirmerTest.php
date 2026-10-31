<?php

declare(strict_types=1);

use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Models\TourGarde;

/*
| Pharmacie de garde sans position (absente d'OpenStreetMap) : publiée avec son téléphone,
| « position à confirmer », sans distance ni point sur la carte, en attendant un relevé.
*/

beforeEach(function (): void {
    $this->travelTo(now()->parse('2026-10-24T20:00:00Z'));
    $this->ville = creerAbidjan();
    $this->situee = creerPharmacie($this->ville, ['nom' => 'Située', 'latitude' => 5.3560, 'longitude' => -3.9700]);
    $this->sansPosition = creerPharmacie($this->ville, ['nom' => 'Sans position', 'latitude' => null, 'longitude' => null, 'telephone' => '+2252722445566']);

    $tour = TourGarde::query()->create([
        'ville_id' => $this->ville->id, 'debut' => now()->subDay(), 'fin' => now()->addDays(6), 'statut' => StatutTour::Publie,
    ]);
    foreach ([$this->sansPosition, $this->situee] as $pharmacie) {
        $tour->gardes()->create(['pharmacie_id' => $pharmacie->id, 'debut' => $tour->debut, 'fin' => $tour->fin]);
    }
});

it('liste de garde : la pharmacie sans position vient après les pharmacies situées, sans distance', function (): void {
    $pharmacies = $this->getJson('/api/v1/gardes/en-cours?ville=vi_abj&lat=5.355&lng=-3.97')->assertOk()->json('data.pharmacies');

    expect(array_column($pharmacies, 'nom'))->toBe(['Située', 'Sans position'])
        ->and($pharmacies[1]['position'])->toBeNull()
        ->and($pharmacies[1]['distance_m'])->toBeNull()
        ->and($pharmacies[1]['marche_min'])->toBeNull()
        ->and($pharmacies[1]['telephone'])->toBe('+2252722445566')
        ->and($pharmacies[1]['statut'])->toBe('garde')
        ->and($pharmacies[0]['position'])->toBe(['lat' => 5.356, 'lng' => -3.97]);
});

it('n\'apparaît ni dans les pharmacies proches ni sur la carte, mais sa fiche s\'ouvre', function (): void {
    $proches = $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&rayon=5000')->assertOk()->json('data');
    expect(array_column($proches, 'nom'))->not->toContain('Sans position');

    $this->getJson("/api/v1/pharmacies/{$this->sansPosition->id_public}?lat=5.355&lng=-3.97")->assertOk()
        ->assertJsonPath('data.position', null)
        ->assertJsonPath('data.distance_m', null);
});

it('pas de temps de trajet sans position', function (): void {
    config(['services.google_routes.cle' => 'cle-de-test']);
    Http::fake();

    $this->getJson("/api/v1/pharmacies/{$this->sansPosition->id_public}/trajet?lat=5.355&lng=-3.97")->assertOk()
        ->assertJsonPath('data.voiture', null);
    Http::assertNothingSent();
});
