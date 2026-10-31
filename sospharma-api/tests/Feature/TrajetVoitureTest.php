<?php

declare(strict_types=1);

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/*
| Temps de trajet en voiture : réponses de l'API Routes de Google simulées (Http::fake), aucun appel réel.
*/

beforeEach(function (): void {
    $this->ville = creerAbidjan();
    $this->pharmacie = creerPharmacie($this->ville, ['nom' => 'Pharmacie des Lagunes', 'latitude' => 5.3600, 'longitude' => -3.9500]);
    $this->url = "/api/v1/pharmacies/{$this->pharmacie->id_public}/trajet?lat=5.3301&lng=-4.0102";
});

it('renvoie la durée en voiture de Google, trafic compris', function (): void {
    config(['services.google_routes.cle' => 'cle-de-test']);
    Http::fake(['routes.googleapis.com/*' => Http::response(['routes' => [['duration' => '754s', 'distanceMeters' => 8421]]])]);

    $this->getJson($this->url)->assertOk()
        ->assertJsonPath('data.voiture', ['minutes' => 13, 'distance_m' => 8421])
        ->assertJsonPath('data.source', 'google');

    Http::assertSent(fn (Request $r): bool => $r->hasHeader('X-Goog-Api-Key', 'cle-de-test')
        && $r->hasHeader('X-Goog-FieldMask', 'routes.duration,routes.distanceMeters')
        && $r['travelMode'] === 'DRIVE'
        && $r['routingPreference'] === 'TRAFFIC_AWARE'
        // Départ arrondi à environ 100 m : la position exacte de l'usager ne part pas chez Google.
        && $r['origin']['location']['latLng'] === ['latitude' => 5.33, 'longitude' => -4.01]);
});

it('garde la réponse en cache quelques minutes : un seul appel pour deux demandes voisines', function (): void {
    config(['services.google_routes.cle' => 'cle-de-test']);
    Http::fake(['routes.googleapis.com/*' => Http::response(['routes' => [['duration' => '300s', 'distanceMeters' => 2000]]])]);

    $this->getJson($this->url)->assertOk();
    $this->getJson("/api/v1/pharmacies/{$this->pharmacie->id_public}/trajet?lat=5.3302&lng=-4.0103")->assertOk();

    Http::assertSentCount(1);
});

it('sans clé configurée : voiture nulle, aucun appel à Google', function (): void {
    config(['services.google_routes.cle' => null]);
    Http::fake();

    $this->getJson($this->url)->assertOk()->assertJsonPath('data.voiture', null)->assertJsonPath('data.source', null);
    Http::assertNothingSent();
});

it('Google en erreur : voiture nulle, l\'app garde son estimation', function (): void {
    config(['services.google_routes.cle' => 'cle-de-test']);
    Http::fake(['routes.googleapis.com/*' => Http::response(['error' => ['message' => 'quota']], 429)]);

    $this->getJson($this->url)->assertOk()->assertJsonPath('data.voiture', null);
});

it('valide la position et refuse une pharmacie inconnue', function (): void {
    $this->getJson("/api/v1/pharmacies/{$this->pharmacie->id_public}/trajet")->assertStatus(422);
    $this->getJson('/api/v1/pharmacies/ph_inconnue/trajet?lat=5.33&lng=-4.01')->assertNotFound();
});

it('limite les demandes par appareil', function (): void {
    config(['services.google_routes.cle' => null, 'sospharma.limites.trajets_par_heure' => 2]);

    $this->getJson($this->url, ['X-Device-Token' => 'appareil-1'])->assertOk();
    $this->getJson($this->url, ['X-Device-Token' => 'appareil-1'])->assertOk();
    $this->getJson($this->url, ['X-Device-Token' => 'appareil-1'])->assertStatus(429);
});
