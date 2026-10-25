<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

it('enveloppe un succès', function (): void {
    creerAbidjan();

    $reponse = $this->getJson('/api/v1/pays')->assertOk()->assertHeader('X-Request-Id');
    $json = $reponse->json();

    verifierMeta($json);
    expect($json['success'])->toBeTrue()
        ->and($json)->not->toHaveKey('error')
        ->and($json['data'][0]['code'])->toBe('CI')
        ->and($json['data'][0]['urgences'][0]['numero'])->toBe('185')
        ->and($reponse->headers->get('X-Request-Id'))->toBe($json['meta']['request_id']);
});

it('enveloppe une route inconnue en NOT_FOUND', function (): void {
    $json = $this->getJson('/api/v1/nexiste-pas')->assertNotFound()->json();

    verifierMeta($json);
    expect($json['success'])->toBeFalse()
        ->and($json)->not->toHaveKey('data')
        ->and($json['error']['code'])->toBe('NOT_FOUND');
});

it('enveloppe une erreur de validation avec les détails par champ', function (): void {
    $json = $this->getJson('/api/v1/zones/depuis-position?lat=abc')->assertStatus(422)->json();

    verifierMeta($json);
    expect($json['error']['code'])->toBe('VALIDATION_FAILED')
        ->and($json['error']['message'])->toBe('Certaines informations sont invalides.')
        ->and($json['error']['details'])->toHaveKeys(['lat', 'lng']);
});

it('répond UNAUTHENTICATED sans jeton sur une route d\'équipe', function (): void {
    $json = $this->getJson('/api/v1/admin/pharmacies')->assertUnauthorized()->json();

    expect($json['error']['code'])->toBe('UNAUTHENTICATED');
});

it('répond FORBIDDEN quand le rôle ne suffit pas', function (): void {
    Sanctum::actingAs(creerCompte(Role::Pharmacien));

    $json = $this->getJson('/api/v1/admin/pharmacies')->assertForbidden()->json();

    verifierMeta($json);
    expect($json['error']['code'])->toBe('FORBIDDEN');
});

it('garde un code HTTP 405 pour une méthode non autorisée', function (): void {
    $json = $this->deleteJson('/api/v1/pays')->assertStatus(405)->json();

    expect($json['error']['code'])->toBe('BAD_REQUEST');
});

it('refuse un filtre non prévu en BAD_REQUEST', function (): void {
    creerAbidjan();

    $json = $this->getJson('/api/v1/pharmacies/proches?lat=5.35&lng=-3.97&filter[inconnu]=1')->assertStatus(400)->json();

    expect($json['error']['code'])->toBe('BAD_REQUEST')
        ->and($json['error']['details'])->toHaveKey('filter');
});

it('reprend le X-Request-Id envoyé par le client', function (): void {
    $this->getJson('/api/v1/pays', ['X-Request-Id' => 'req_client_123456'])
        ->assertHeader('X-Request-Id', 'req_client_123456')
        ->assertJsonPath('meta.request_id', 'req_client_123456');
});

it('transforme une panne imprévue en SERVER_ERROR sans détail technique', function (): void {
    config(['app.debug' => false]);
    Route::get('/api/v1/test-panne', fn () => throw new RuntimeException('secret interne'))->middleware('api');

    $json = $this->getJson('/api/v1/test-panne')->assertStatus(500)->json();

    expect($json['error']['code'])->toBe('SERVER_ERROR')
        ->and($json['error'])->not->toHaveKey('details')
        ->and(json_encode($json))->not->toContain('secret interne');
});

it('répond ZONE_NOT_COVERED hors des communes connues', function (): void {
    creerAbidjan();

    $json = $this->getJson('/api/v1/zones/depuis-position?lat=7.69&lng=-5.03')->assertStatus(422)->json();

    expect($json['error']['code'])->toBe('ZONE_NOT_COVERED');
});
