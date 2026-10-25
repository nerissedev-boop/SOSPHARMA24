<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Gardes\Models\TourGarde;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->abidjan = creerAbidjan();
    $this->autreVille = creerVille($this->abidjan->pays, 'Yamoussoukro');
});

it('laisse un admin lister toutes les pharmacies', function (): void {
    creerPharmacie($this->abidjan);
    creerPharmacie($this->autreVille);
    Sanctum::actingAs(creerCompte(Role::Admin));

    $this->getJson('/api/v1/admin/pharmacies')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 2)
        ->assertJsonPath('meta.pagination.per_page', 20);
});

it('limite un éditeur aux pharmacies de sa ville', function (): void {
    creerPharmacie($this->abidjan);
    $ailleurs = creerPharmacie($this->autreVille);
    Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));

    $this->getJson('/api/v1/admin/pharmacies')->assertOk()->assertJsonPath('meta.pagination.total', 1);
    $this->patchJson('/api/v1/admin/pharmacies/'.$ailleurs->id_public, ['nom' => 'Piratée'])
        ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');
});

it('interdit à un éditeur de créer un tour dans une autre ville', function (): void {
    Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));

    $this->postJson('/api/v1/admin/tours-garde', [
        'ville' => $this->autreVille->id_public, 'debut' => '2026-10-24T08:00:00Z', 'fin' => '2026-10-31T08:00:00Z',
    ])->assertForbidden();

    $this->postJson('/api/v1/admin/tours-garde', [
        'ville' => $this->abidjan->id_public, 'debut' => '2026-10-24T08:00:00Z', 'fin' => '2026-10-31T08:00:00Z',
    ])->assertCreated()->assertJsonPath('data.statut', 'brouillon');

    expect(TourGarde::query()->count())->toBe(1);
});

it('réserve la gestion des comptes et les imports aux admins', function (): void {
    Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));

    $this->getJson('/api/v1/admin/comptes')->assertForbidden();
    $this->postJson('/api/v1/admin/pharmacies/import', ['ville' => 'vi_abj'])->assertForbidden();
});

it('limite un pharmacien à sa propre pharmacie', function (): void {
    $sienne = creerPharmacie($this->abidjan, ['nom' => 'La sienne']);
    creerPharmacie($this->abidjan, ['nom' => 'Une autre']);
    $pharmacien = creerCompte(Role::Pharmacien);
    $sienne->membres()->attach($pharmacien->id);
    Sanctum::actingAs($pharmacien);

    $this->getJson('/api/v1/pharmacien/pharmacie')->assertOk()->assertJsonPath('data.nom', 'La sienne');
    $this->patchJson('/api/v1/pharmacien/pharmacie', ['telephone' => '+2250000000999'])
        ->assertOk()->assertJsonPath('data.telephone', '+2250000000999');
    $this->getJson('/api/v1/admin/pharmacies')->assertForbidden();
});

it('refuse un compte désactivé', function (): void {
    Sanctum::actingAs(creerCompte(Role::Admin, null, ['actif' => false]));

    $this->getJson('/api/v1/admin/pharmacies')->assertForbidden();
});

it('connecte un compte et renvoie un jeton', function (): void {
    creerCompte(Role::Admin, null, ['email' => 'admin@sospharma.test']);

    $this->postJson('/api/v1/auth/connexion', ['email' => 'admin@sospharma.test', 'password' => 'Mot-de-passe-test-1'])
        ->assertOk()
        ->assertJsonPath('data.type_jeton', 'Bearer')
        ->assertJsonPath('data.compte.role', 'admin');

    $this->postJson('/api/v1/auth/connexion', ['email' => 'admin@sospharma.test', 'password' => 'faux'])
        ->assertStatus(422)->assertJsonPath('error.details.email.0', 'E-mail ou mot de passe incorrect.');
});
