<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Models\PropositionAssurance;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Models\Releve;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    Storage::fake('local');
    Storage::fake('public');
    $this->travelTo(now()->parse('2026-10-20T10:00:00Z'));

    $this->abidjan = creerAbidjan(); // Cocody : 5.330–5.380, -4.010 – -3.930
    $this->yamoussoukro = creerVille($this->abidjan->pays, 'Yamoussoukro');
    creerZone($this->yamoussoukro, 'Yamoussoukro centre', [6.780, 6.860, -5.320, -5.230]);
    $this->cmu = creerAssurance($this->abidjan->pays, 'CMU', TypeAssurance::Publique, 'cmu');

    $this->agent = creerAgent($this->abidjan);
    Sanctum::actingAs($this->agent);
});

/**
 * Corps d'un relevé de création à Cocody, avec un identifiant de téléphone.
 * Les surcharges remplacent les clés de premier niveau ; « champs » est fusionné clé par clé.
 */
function releve(object $test, array $surcharges = []): array
{
    $base = [
        'identifiant' => '6f1c2d3e-0000-4000-8000-000000000001',
        'latitude' => 5.3600,
        'longitude' => -3.9600,
        'precision_m' => 8,
        'ajustement_m' => 3,
        'releve_le' => '2026-10-20T09:55:00Z',
        'champs' => [
            'nom' => 'Pharmacie relevée (test)',
            'adresse' => 'Face au marché fictif',
            'telephone' => '+2250000000999',
            'h24' => false,
            'horaires' => [['jour' => 2, 'ouverture' => '08:00', 'fermeture' => '20:00']],
            'assurances' => [['id' => $test->cmu->id_public, 'tiers_payant' => true]],
            'assurances_proposees' => ['Mutuelle du Port (proposée)'],
        ],
    ];
    $champs = array_replace($base['champs'], $surcharges['champs'] ?? []);

    return array_replace($base, $surcharges, ['champs' => $champs]);
}

function envoyerFacade(object $test, string $releveId): void
{
    $test->post("/api/v1/agent/releves/{$releveId}/photos", [
        'type' => 'facade',
        'photo' => UploadedFile::fake()->image('facade.jpg', 640, 480),
    ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.metadonnees_supprimees', true);
}

describe('envoi par l\'agent', function (): void {
    it('est idempotent : un renvoi avec le même identifiant renvoie le même relevé', function (): void {
        $premier = $this->postJson('/api/v1/agent/releves', releve($this))
            ->assertCreated()
            ->assertJsonPath('data.statut', 'envoye')
            ->assertJsonPath('data.type', 'creation')
            ->assertJsonPath('data.ville.id', 'vi_abj')
            ->json('data.id');

        $this->postJson('/api/v1/agent/releves', releve($this, ['champs' => ['nom' => 'Autre nom']]))
            ->assertOk()
            ->assertJsonPath('data.id', $premier)
            ->assertJsonPath('data.champs.nom', 'Pharmacie relevée (test)')
            ->assertJsonPath('meta.deja_recu', true);

        expect(Releve::query()->count())->toBe(1);
    });

    it('refuse une position trop imprécise', function (): void {
        $this->postJson('/api/v1/agent/releves', releve($this, ['precision_m' => 45]))
            ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    });

    it('interdit de relever hors de ses villes (403)', function (): void {
        $this->postJson('/api/v1/agent/releves', releve($this, ['latitude' => 6.82, 'longitude' => -5.27]))
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');

        $ailleurs = creerPharmacie($this->yamoussoukro, ['latitude' => 6.82, 'longitude' => -5.27]);
        $this->postJson('/api/v1/agent/releves', releve($this, ['identifiant' => 'autre-identifiant-01', 'pharmacie' => $ailleurs->id_public]))
            ->assertForbidden();

        expect(Releve::query()->count())->toBe(0);
    });

    it('interdit les routes agent aux autres rôles et le relevé d\'un autre agent', function (): void {
        $id = $this->postJson('/api/v1/agent/releves', releve($this))->assertCreated()->json('data.id');

        Sanctum::actingAs(creerAgent($this->abidjan));
        $this->post("/api/v1/agent/releves/{$id}/photos", ['type' => 'facade', 'photo' => UploadedFile::fake()->image('f.jpg')], ['Accept' => 'application/json'])
            ->assertForbidden();

        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));
        $this->postJson('/api/v1/agent/releves', releve($this, ['identifiant' => 'editeur-0000001']))->assertForbidden();
    });

    it('limite le nombre de relevés par jour', function (): void {
        config(['sospharma.limites.releves_par_jour' => 2]);

        foreach (['limite-000000001', 'limite-000000002'] as $identifiant) {
            $this->postJson('/api/v1/agent/releves', releve($this, ['identifiant' => $identifiant]))->assertCreated();
        }
        $this->postJson('/api/v1/agent/releves', releve($this, ['identifiant' => 'limite-000000003']))
            ->assertStatus(429)->assertJsonPath('error.code', 'TOO_MANY_REQUESTS');
    });

    it('liste ses relevés par curseur', function (): void {
        $this->postJson('/api/v1/agent/releves', releve($this))->assertCreated();

        $this->getJson('/api/v1/agent/releves?filter[statut]=envoye')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.next_cursor', null);
    });
});

describe('doublons à 100 m', function (): void {
    it('renvoie les pharmacies connues à moins de 100 m, triées par distance', function (): void {
        creerPharmacie($this->abidjan, ['nom' => 'À 50 m', 'latitude' => 5.36045, 'longitude' => -3.9600]);
        creerPharmacie($this->abidjan, ['nom' => 'À 20 m', 'latitude' => 5.36018, 'longitude' => -3.9600]);
        creerPharmacie($this->abidjan, ['nom' => 'À 150 m', 'latitude' => 5.36135, 'longitude' => -3.9600]);

        $json = $this->getJson('/api/v1/agent/pharmacies/proches?lat=5.36&lng=-3.96')->assertOk()->json();

        expect(array_column($json['data'], 'nom'))->toBe(['À 20 m', 'À 50 m'])
            ->and($json['data'][1]['distance_m'])->toBeGreaterThan(45)->toBeLessThan(55)
            ->and($json['meta'])->toMatchArray(['rayon' => 100, 'nombre' => 2]);

        $this->getJson('/api/v1/agent/pharmacies/proches?lat=5.36&lng=-3.96&rayon=500')->assertStatus(422);
    });
});

describe('validation par l\'équipe', function (): void {
    it('crée la pharmacie par le module Pharmacies et publie la façade', function (): void {
        $id = $this->postJson('/api/v1/agent/releves', releve($this))->assertCreated()->json('data.id');
        envoyerFacade($this, $id);

        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));
        $this->postJson("/api/v1/admin/releves/{$id}/valider")
            ->assertOk()->assertJsonPath('data.statut', 'valide')->assertJsonPath('data.photos.0.publiee', true);

        $pharmacie = Pharmacie::query()->where('nom', 'Pharmacie relevée (test)')->sole();
        expect($pharmacie->zone?->nom)->toBe('Cocody')
            ->and($pharmacie->telephone)->toBe('+2250000000999')
            ->and($pharmacie->verifiee_le)->not->toBeNull()
            ->and($pharmacie->horaires)->toHaveCount(1)
            ->and($pharmacie->assurances->pluck('slug')->all())->toBe(['cmu'])
            ->and((bool) $pharmacie->assurances->first()->pivot->tiers_payant)->toBeTrue()
            ->and($pharmacie->photo_facade)->not->toBeNull();
        Storage::disk('public')->assertExists((string) $pharmacie->photo_facade);

        $releve = Releve::query()->where('id_public', $id)->sole();
        expect($releve->pharmacie_id)->toBe($pharmacie->id)
            ->and($releve->traite_par)->not->toBeNull()
            ->and(PropositionAssurance::query()->where('releve_id', $releve->id)->count())->toBe(1);

        // La fiche publique montre la photo et la vérification.
        $this->getJson('/api/v1/pharmacies/'.$pharmacie->id_public)
            ->assertOk()->assertJsonPath('data.assurances.0.nom', 'CMU');
    });

    it('exige la photo de façade', function (): void {
        $id = $this->postJson('/api/v1/agent/releves', releve($this))->assertCreated()->json('data.id');

        Sanctum::actingAs(creerCompte(Role::Admin));
        $this->postJson("/api/v1/admin/releves/{$id}/valider")
            ->assertStatus(422)->assertJsonPath('error.details.photos.0', 'La photo de façade est obligatoire pour valider un relevé.');
        expect(Pharmacie::query()->count())->toBe(0);
    });

    it('met à jour une pharmacie existante, avec la comparaison avant/après', function (): void {
        $existante = creerPharmacie($this->abidjan, ['nom' => 'Pharmacie existante', 'telephone' => '+2250000000111', 'latitude' => 5.36010, 'longitude' => -3.96005]);
        $id = $this->postJson('/api/v1/agent/releves', releve($this, [
            'pharmacie' => $existante->id_public,
            'champs' => ['nom' => 'Pharmacie existante', 'telephone' => '+2250000000222', 'assurances' => [], 'assurances_proposees' => [], 'horaires' => []],
        ]))->assertCreated()->assertJsonPath('data.type', 'mise_a_jour')->json('data.id');
        envoyerFacade($this, $id);

        Sanctum::actingAs(creerCompte(Role::Admin));
        $comparaison = collect($this->getJson("/api/v1/admin/releves/{$id}")->assertOk()->json('data.comparaison'))->keyBy('champ');
        expect($comparaison['telephone'])->toMatchArray(['avant' => '+2250000000111', 'apres' => '+2250000000222', 'modifie' => true])
            ->and($comparaison['nom']['modifie'])->toBeFalse()
            ->and($comparaison['position']['ecart_m'])->toBeLessThan(20);

        $this->postJson("/api/v1/admin/releves/{$id}/valider", ['corrections' => ['quartier' => 'Quartier corrigé']])->assertOk();

        expect(Pharmacie::query()->count())->toBe(1)
            ->and($existante->refresh()->telephone)->toBe('+2250000000222')
            ->and($existante->quartier)->toBe('Quartier corrigé')
            ->and(Releve::query()->where('id_public', $id)->value('fiche_avant'))->not->toBeNull();
    });

    it('renvoie à l\'agent, accepte la correction, puis rejette', function (): void {
        $id = $this->postJson('/api/v1/agent/releves', releve($this))->assertCreated()->json('data.id');
        $editeur = creerCompte(Role::EditeurVille, $this->abidjan);

        Sanctum::actingAs($editeur);
        $this->postJson("/api/v1/admin/releves/{$id}/a-corriger", ['commentaire' => 'Photo de l\'enseigne illisible'])
            ->assertOk()->assertJsonPath('data.statut', 'a_corriger');

        Sanctum::actingAs($this->agent);
        $this->patchJson("/api/v1/agent/releves/{$id}", ['champs' => ['quartier' => 'Riviera (test)']])
            ->assertOk()->assertJsonPath('data.statut', 'envoye')->assertJsonPath('data.champs.quartier', 'Riviera (test)');
        $this->patchJson("/api/v1/agent/releves/{$id}", ['champs' => ['quartier' => 'Encore']])
            ->assertStatus(409)->assertJsonPath('error.code', 'CONFLICT');

        Sanctum::actingAs($editeur);
        $this->postJson("/api/v1/admin/releves/{$id}/rejeter", ['raison' => 'Doublon de ph_test01'])
            ->assertOk()->assertJsonPath('data.statut', 'rejete');
        $this->postJson("/api/v1/admin/releves/{$id}/valider")->assertStatus(409);

        expect(Releve::query()->where('id_public', $id)->value('statut'))->toBe(StatutReleve::Rejete);
    });

    it('limite l\'éditeur à la file de sa ville', function (): void {
        $id = $this->postJson('/api/v1/agent/releves', releve($this))->assertCreated()->json('data.id');

        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->yamoussoukro));
        $this->getJson('/api/v1/admin/releves')->assertOk()->assertJsonPath('meta.pagination.total', 0);
        $this->getJson("/api/v1/admin/releves/{$id}")->assertForbidden();
        $this->postJson("/api/v1/admin/releves/{$id}/valider")->assertForbidden();

        Sanctum::actingAs(creerCompte(Role::Admin));
        $this->getJson('/api/v1/admin/releves?filter[ville]=vi_abj')
            ->assertOk()->assertJsonPath('meta.pagination.total', 1)->assertJsonPath('data.0.agent.id', $this->agent->id_public);
    });
});
