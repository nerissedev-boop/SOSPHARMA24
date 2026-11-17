<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

/*
| Photo de façade posée par l'équipe depuis le back-office, sans relevé terrain.
*/

beforeEach(function (): void {
    Storage::fake('public');
    $this->abidjan = creerAbidjan();
    $this->pharmacie = creerPharmacie($this->abidjan, ['nom' => 'Pharmacie Latrille', 'latitude' => 5.36, 'longitude' => -3.98]);
    $this->url = '/api/v1/admin/pharmacies/'.$this->pharmacie->id_public.'/photo';
    Sanctum::actingAs(creerCompte(Role::Admin));
});

function envoyerFacadeAdmin(object $test, ?UploadedFile $photo = null): TestResponse
{
    return $test->post($test->url, ['photo' => $photo ?? UploadedFile::fake()->image('facade.jpg', 800, 600)], ['Accept' => 'application/json']);
}

it('pose la photo, la publie sur le disque public et la renvoie dans la fiche et dans l’app', function (): void {
    $json = envoyerFacadeAdmin($this)->assertOk()->json();

    verifierMeta($json);
    $chemin = $this->pharmacie->refresh()->photo_facade;
    expect($chemin)->toStartWith('pharmacies/facades/'.$this->pharmacie->id_public.'-')->toEndWith('.jpg')
        ->and($json['data']['photo_facade'])->toBe(Storage::disk('public')->url($chemin));
    Storage::disk('public')->assertExists($chemin);

    // L'app la reçoit aussitôt (fiche publique).
    $this->getJson('/api/v1/pharmacies/'.$this->pharmacie->id_public)
        ->assertOk()->assertJsonPath('data.photo_facade', Storage::disk('public')->url($chemin));
});

it('remplace la photo précédente et supprime son fichier', function (): void {
    envoyerFacadeAdmin($this)->assertOk();
    $premiere = $this->pharmacie->refresh()->photo_facade;

    envoyerFacadeAdmin($this, UploadedFile::fake()->image('autre.png', 640, 480))->assertOk();
    $seconde = $this->pharmacie->refresh()->photo_facade;

    expect($seconde)->not->toBe($premiere)->toEndWith('.png');
    Storage::disk('public')->assertMissing($premiere);
    Storage::disk('public')->assertExists($seconde);
});

it('retire la photo : fiche sans photo, fichier supprimé ; retirer deux fois ne casse rien', function (): void {
    envoyerFacadeAdmin($this)->assertOk();
    $chemin = $this->pharmacie->refresh()->photo_facade;

    $this->deleteJson($this->url)->assertOk()->assertJsonPath('data.photo_facade', null);
    expect($this->pharmacie->refresh()->photo_facade)->toBeNull();
    Storage::disk('public')->assertMissing($chemin);

    $this->deleteJson($this->url)->assertOk()->assertJsonPath('data.photo_facade', null);
});

it('refuse un fichier qui n’est pas une image, ou trop lourd', function (): void {
    envoyerFacadeAdmin($this, UploadedFile::fake()->create('liste.pdf', 100, 'application/pdf'))
        ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    envoyerFacadeAdmin($this, UploadedFile::fake()->image('enorme.jpg')->size(6000))
        ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    $this->post($this->url, [], ['Accept' => 'application/json'])
        ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');

    expect($this->pharmacie->refresh()->photo_facade)->toBeNull();
});

it('l’éditeur d’une autre ville ne peut ni poser ni retirer la photo', function (): void {
    $bouake = creerVille($this->abidjan->pays, 'Bouaké', idPublic: 'vi_bke');
    Sanctum::actingAs(creerCompte(Role::EditeurVille, $bouake));

    envoyerFacadeAdmin($this)->assertForbidden();
    $this->deleteJson($this->url)->assertForbidden();
});

it('l’éditeur de la ville de la pharmacie peut poser la photo', function (): void {
    Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));

    envoyerFacadeAdmin($this)->assertOk();
    expect($this->pharmacie->refresh()->photo_facade)->not->toBeNull();
});

it('demande une connexion', function (): void {
    app('auth')->forgetGuards();
    $this->post($this->url, ['photo' => UploadedFile::fake()->image('f.jpg')], ['Accept' => 'application/json'])->assertUnauthorized();
});
