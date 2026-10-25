<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Releves\Enums\OrigineReleve;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Models\Releve;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    Storage::fake('local');
    Storage::fake('public');
    Http::fake(['*' => Http::response(['data' => [['status' => 'ok', 'id' => 'ticket-1']]])]);
    $this->travelTo(now()->parse('2026-10-20T10:00:00Z'));

    $this->abidjan = creerAbidjan(); // Cocody : 5.330–5.380, -4.010 – -3.930
    $this->jeton = appareilProposant($this, 'ExponentPushToken[proposant-test]');
});

/** Enregistre un appareil (avec jeton Expo facultatif) et renvoie son jeton X-Device-Token. */
function appareilProposant(object $test, ?string $jetonExpo = null): string
{
    return $test->postJson('/api/v1/appareils', array_filter([
        'identifiant_anonyme' => 'proposant-'.random_int(100000, 999999).'-abcdef',
        'jeton_expo' => $jetonExpo,
    ]))->assertCreated()->json('data.jeton');
}

/** Corps d'une proposition à Cocody : le repère et la position du téléphone à quelques mètres. */
function proposition(array $surcharges = []): array
{
    return array_replace([
        'identifiant' => '9a1c2d3e-0000-4000-8000-000000000001',
        'latitude' => 5.3600,
        'longitude' => -3.9600,
        'gps_latitude' => 5.36005,
        'gps_longitude' => -3.96002,
        'precision_m' => 12,
        'releve_le' => '2026-10-20T09:58:00Z',
        'nom' => 'Pharmacie proposée (test)',
        'telephone' => '+2250000000123',
    ], $surcharges);
}

function proposer(object $test, array $surcharges = [], ?string $jeton = null)
{
    return $test->postJson('/api/v1/propositions', proposition($surcharges), ['X-Device-Token' => $jeton ?? $test->jeton]);
}

describe('envoi par un usager sans compte', function (): void {
    it('crée une proposition d\'origine public, idempotente, sans révéler la position', function (): void {
        $id = proposer($this)
            ->assertCreated()
            ->assertJsonPath('data.statut', 'en_verification')
            ->assertJsonPath('data.nom', 'Pharmacie proposée (test)')
            ->assertJsonPath('data.ville.id', 'vi_abj')
            ->assertJsonMissingPath('data.position')
            ->json('data.id');

        proposer($this, ['nom' => 'Autre nom'])->assertOk()->assertJsonPath('data.id', $id)->assertJsonPath('meta.deja_recu', true);

        $releve = Releve::query()->sole();
        expect($releve->origine)->toBe(OrigineReleve::Public)
            ->and($releve->agent_id)->toBeNull()
            ->and($releve->appareil_id)->not->toBeNull()
            ->and($releve->champs)->toBe(['nom' => 'Pharmacie proposée (test)', 'telephone' => '+2250000000123']);
    });

    it('exige un appareil reconnu', function (): void {
        $this->postJson('/api/v1/propositions', proposition())->assertUnauthorized();
        expect(Releve::query()->count())->toBe(0);
    });

    it('refuse un repère à plus de 100 m du téléphone', function (): void {
        proposer($this, ['gps_latitude' => 5.3620])
            ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['details' => ['latitude']]]);
    });

    it('refuse une position imprécise ou hors des zones couvertes', function (): void {
        proposer($this, ['precision_m' => 45])->assertStatus(422);
        proposer($this, ['latitude' => 7.69, 'longitude' => -5.03, 'gps_latitude' => 7.69, 'gps_longitude' => -5.03])
            ->assertJsonPath('error.code', 'ZONE_NOT_COVERED');
    });

    it('limite à 3 propositions par jour et par appareil', function (): void {
        foreach (['jour-000000001', 'jour-000000002', 'jour-000000003'] as $identifiant) {
            proposer($this, ['identifiant' => $identifiant])->assertCreated();
        }
        proposer($this, ['identifiant' => 'jour-000000004'])
            ->assertStatus(429)->assertJsonPath('error.code', 'TOO_MANY_REQUESTS');
    });

    it('reçoit la façade, et seul l\'appareil auteur peut l\'envoyer', function (): void {
        $id = proposer($this)->assertCreated()->json('data.id');
        $photo = fn () => ['photo' => UploadedFile::fake()->image('facade.jpg', 640, 480)];

        $this->post("/api/v1/propositions/{$id}/photo", $photo(), ['Accept' => 'application/json', 'X-Device-Token' => appareilProposant($this)])
            ->assertNotFound();
        $this->post("/api/v1/propositions/{$id}/photo", $photo(), ['Accept' => 'application/json', 'X-Device-Token' => $this->jeton])
            ->assertCreated()->assertJsonPath('data.type', 'facade')->assertJsonPath('data.metadonnees_supprimees', true);

        $this->getJson('/api/v1/propositions', ['X-Device-Token' => $this->jeton])
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.photo_facade_recue', true);
        $this->getJson('/api/v1/propositions', ['X-Device-Token' => appareilProposant($this)])
            ->assertOk()->assertJsonCount(0, 'data');
    });
});

describe('validation par l\'équipe', function (): void {
    beforeEach(function (): void {
        $this->id = proposer($this)->assertCreated()->json('data.id');
        $this->post("/api/v1/propositions/{$this->id}/photo", ['photo' => UploadedFile::fake()->image('facade.jpg')], ['Accept' => 'application/json', 'X-Device-Token' => $this->jeton])
            ->assertCreated();
        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));
    });

    it('apparaît dans la file, après les relevés d\'agents, avec la fiabilité de l\'appareil', function (): void {
        $this->getJson('/api/v1/admin/releves?filter[origine]=public')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.origine', 'public')
            ->assertJsonPath('data.0.agent', null)
            ->assertJsonPath('data.0.appareil', ['acceptees' => 0, 'refusees' => 0]);
    });

    it('exige l\'adresse dans les corrections, puis publie et prévient l\'appareil', function (): void {
        $this->postJson("/api/v1/admin/releves/{$this->id}/valider")
            ->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['corrections.adresse']]]);

        $this->postJson("/api/v1/admin/releves/{$this->id}/valider", ['corrections' => ['adresse' => 'Carrefour fictif']])
            ->assertOk()->assertJsonPath('data.statut', 'valide');

        expect(Pharmacie::query()->where('nom', 'Pharmacie proposée (test)')->exists())->toBeTrue();
        Http::assertSent(fn ($requete) => str_contains((string) $requete->body(), 'ExponentPushToken[proposant-test]')
            && str_contains((string) $requete->body(), 'en ligne'));

        Sanctum::actingAs(creerAgent($this->abidjan)); // l'en-tête suffit : la route est publique
        $this->getJson('/api/v1/propositions', ['X-Device-Token' => $this->jeton])
            ->assertJsonPath('data.0.statut', 'en_ligne')
            ->assertJsonPath('data.0.pharmacie_id', Pharmacie::query()->where('nom', 'Pharmacie proposée (test)')->value('id_public'));
    });

    it('fusionne avec une pharmacie existante', function (): void {
        $existante = creerPharmacie($this->abidjan, ['nom' => 'Déjà connue', 'latitude' => 5.36003, 'longitude' => -3.96]);

        $this->postJson("/api/v1/admin/releves/{$this->id}/valider", ['fusionner_avec' => $existante->id_public, 'corrections' => ['nom' => 'Déjà connue']])
            ->assertOk()->assertJsonPath('data.type', 'mise_a_jour');

        expect(Pharmacie::query()->count())->toBe(1)
            ->and(Releve::query()->sole()->pharmacie_id)->toBe($existante->id);
    });

    it('ne renvoie pas une proposition « à corriger », mais la rejette avec un motif visible', function (): void {
        $this->postJson("/api/v1/admin/releves/{$this->id}/a-corriger", ['commentaire' => 'Photo floue'])->assertStatus(409);

        $this->postJson("/api/v1/admin/releves/{$this->id}/rejeter", ['raison' => 'Ce n\'est pas une pharmacie'])
            ->assertOk()->assertJsonPath('data.statut', 'rejete');

        $this->getJson('/api/v1/propositions', ['X-Device-Token' => $this->jeton])
            ->assertJsonPath('data.0.statut', 'refusee')
            ->assertJsonPath('data.0.motif_refus', 'Ce n\'est pas une pharmacie');
        expect(Releve::query()->sole()->statut)->toBe(StatutReleve::Rejete);
    });
});

describe('vérification avant envoi', function (): void {
    it('garde les pharmacies proches écartées par l\'usager et les signale à l\'équipe', function (): void {
        $proche = creerPharmacie($this->abidjan, ['nom' => 'Proche, écartée', 'latitude' => 5.36030, 'longitude' => -3.9600]);
        creerPharmacie($this->abidjan, ['nom' => 'Proche, non vue', 'latitude' => 5.36060, 'longitude' => -3.9600]);

        // Ce que l'app interroge avant d'afficher « Est-ce l'une de celles-ci ? ».
        $this->getJson('/api/v1/pharmacies/proches?lat=5.36&lng=-3.96&rayon=100')->assertOk()->assertJsonCount(2, 'data');

        $id = proposer($this, ['doublons_ecartes' => [$proche->id_public]])->assertCreated()->json('data.id');
        expect(Releve::query()->sole()->doublons_ecartes)->toBe([$proche->id_public]);

        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));
        $doublons = collect($this->getJson("/api/v1/admin/releves/{$id}")->assertOk()
            ->assertJsonPath('data.doublons_ecartes', [$proche->id_public])
            ->json('data.doublons'))->keyBy('nom');
        expect($doublons['Proche, écartée']['ecarte_par_usager'])->toBeTrue()
            ->and($doublons['Proche, non vue']['ecarte_par_usager'])->toBeFalse();
    });

    it('refuse des identifiants de pharmacie mal formés', function (): void {
        proposer($this, ['doublons_ecartes' => ['pas-un-id']])
            ->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['doublons_ecartes.0']]]);
    });
});
