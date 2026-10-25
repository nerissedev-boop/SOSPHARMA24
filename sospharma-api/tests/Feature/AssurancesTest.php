<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Pharmacies\Enums\StatutProposition;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\PropositionAssurance;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    // Mardi 20 octobre 2026, 10:00 à Abidjan.
    $this->travelTo(now()->parse('2026-10-20T10:00:00Z'));
    $this->ville = creerAbidjan();
    $this->pays = $this->ville->pays;

    $this->cmu = creerAssurance($this->pays, 'CMU', TypeAssurance::Publique, 'cmu');
    $this->mugef = creerAssurance($this->pays, 'MUGEF-CI', TypeAssurance::Publique, 'mugef-ci');
    $this->privee = creerAssurance($this->pays, '[Assureur privé A]', TypeAssurance::Privee, 'assureur-prive-a');

    // Trois pharmacies à quelques centaines de mètres les unes des autres (Cocody).
    $this->a = creerPharmacie($this->ville, ['nom' => 'A', 'latitude' => 5.3560, 'longitude' => -3.9700]);
    $this->b = creerPharmacie($this->ville, ['nom' => 'B', 'latitude' => 5.3580, 'longitude' => -3.9700]);
    $this->c = creerPharmacie($this->ville, ['nom' => 'C', 'latitude' => 5.3600, 'longitude' => -3.9700]);
    lierAssurances($this->a, $this->cmu);
    lierAssurances($this->b, $this->mugef, $this->privee);
});

/** Enregistre un appareil et renvoie son jeton X-Device-Token. */
function jetonAppareil(object $test): string
{
    return $test->postJson('/api/v1/appareils', ['identifiant_anonyme' => 'appareil-test-'.random_int(100000, 999999).'-abcdef'])
        ->assertCreated()->json('data.jeton');
}

describe('filtre filter[assurances] (au moins une)', function (): void {
    it('garde les pharmacies qui acceptent au moins une des assurances', function (): void {
        $json = $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[assurances]=cmu,mugef-ci')->assertOk()->json();

        verifierMeta($json);
        expect(array_column($json['data'], 'nom'))->toBe(['A', 'B']);

        $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[assurances]=assureur-prive-a')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nom', 'B');
    });

    it('s\'applique aussi au cadre, à la recherche et à l\'admin', function (): void {
        $this->getJson('/api/v1/pharmacies/cadre?bbox=-3.98,5.35,-3.96,5.37&filter[assurances]=cmu')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nom', 'A');

        Sanctum::actingAs(creerCompte(Role::Admin));
        $this->getJson('/api/v1/admin/pharmacies?filter[assurances]=mugef-ci,cmu')
            ->assertOk()->assertJsonPath('meta.pagination.total', 2);
    });

    it('ignore une assurance désactivée et refuse un slug mal formé', function (): void {
        $this->cmu->update(['actif' => false]);

        $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[assurances]=cmu')
            ->assertOk()->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[assurances]=CMU%20!')
            ->assertStatus(400)->assertJsonPath('error.code', 'BAD_REQUEST');
    });

    it('refuse l\'ancien filtre filter[assurance]', function (): void {
        $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[assurance]=cmu')
            ->assertStatus(400)->assertJsonPath('error.code', 'BAD_REQUEST');
    });
});

describe('assurances et accepte_mes_assurances dans les ressources', function (): void {
    it('renvoie les assurances de chaque pharmacie, régimes publics d\'abord', function (): void {
        $this->b->assurances()->updateExistingPivot($this->privee->id, ['tiers_payant' => true]);

        $b = collect($this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97')->assertOk()->json('data'))->firstWhere('nom', 'B');

        expect($b['assurances'])->toBe([
            ['id' => $this->mugef->id_public, 'slug' => 'mugef-ci', 'nom' => 'MUGEF-CI', 'type' => 'publique', 'tiers_payant' => false],
            ['id' => $this->privee->id_public, 'slug' => 'assureur-prive-a', 'nom' => '[Assureur privé A]', 'type' => 'privee', 'tiers_payant' => true],
        ])->and($b)->toHaveKey('accepte_mes_assurances')
            ->and($b['accepte_mes_assurances'])->toBeNull();
    });

    it('vaut null sans appareil ou pour un appareil sans assurance', function (): void {
        $jeton = jetonAppareil($this);

        $this->getJson('/api/v1/pharmacies/'.$this->a->id_public, ['X-Device-Token' => $jeton])
            ->assertOk()->assertJsonPath('data.accepte_mes_assurances', null);
    });

    it('dit si la pharmacie accepte au moins une des assurances de l\'appareil', function (): void {
        $jeton = jetonAppareil($this);

        $this->putJson('/api/v1/appareils/moi/assurances', ['assurances' => [$this->cmu->id_public]], ['X-Device-Token' => $jeton])
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'cmu');
        $this->getJson('/api/v1/appareils/moi/assurances', ['X-Device-Token' => $jeton])
            ->assertOk()->assertJsonPath('data.0.id', $this->cmu->id_public);

        $parNom = collect($this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97', ['X-Device-Token' => $jeton])->assertOk()->json('data'))
            ->pluck('accepte_mes_assurances', 'nom')->all();
        expect($parNom)->toBe(['A' => true, 'B' => false, 'C' => false]);

        $this->getJson('/api/v1/pharmacies/'.$this->a->id_public, ['X-Device-Token' => $jeton])
            ->assertOk()->assertJsonPath('data.accepte_mes_assurances', true);
    });

    it('refuse une assurance inconnue et exige un appareil', function (): void {
        $jeton = jetonAppareil($this);

        $this->putJson('/api/v1/appareils/moi/assurances', ['assurances' => ['as_inconnue']], ['X-Device-Token' => $jeton])
            ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
        $this->getJson('/api/v1/appareils/moi/assurances')
            ->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHENTICATED');
    });
});

describe('référentiel et assurances d\'une pharmacie', function (): void {
    it('liste les assurances actives d\'un pays, régimes publics d\'abord', function (): void {
        creerAssurance($this->pays, '[Mutuelle désactivée]', TypeAssurance::Mutuelle, actif: false);

        $this->getJson('/api/v1/pays/CI/assurances')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.type', 'publique')
            ->assertJsonPath('data.2.slug', 'assureur-prive-a')
            ->assertJsonMissingPath('meta.pagination');
    });

    it('laisse l\'admin créer, filtrer et désactiver des assurances', function (): void {
        Sanctum::actingAs(creerCompte(Role::Admin));

        $this->postJson('/api/v1/admin/assurances', ['pays' => 'CI', 'nom' => '[Mutuelle fictive B]', 'type' => 'mutuelle'])
            ->assertCreated()->assertJsonPath('data.slug', 'mutuelle-fictive-b')->assertJsonPath('data.pays', 'CI');
        $this->postJson('/api/v1/admin/assurances', ['pays' => 'CI', 'nom' => 'Autre', 'slug' => 'cmu', 'type' => 'privee'])
            ->assertStatus(422)->assertJsonPath('error.details.slug.0', 'Le slug « cmu » est déjà utilisé dans ce pays.');

        $this->getJson('/api/v1/admin/assurances?filter[type]=publique&filter[pays]=CI&q=mug')
            ->assertOk()->assertJsonPath('meta.pagination.total', 1)->assertJsonPath('data.0.slug', 'mugef-ci');

        $this->deleteJson('/api/v1/admin/assurances/'.$this->privee->id_public)->assertOk()->assertJsonPath('data.actif', false);
    });

    it('réserve le référentiel aux admins', function (): void {
        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->ville));

        $this->postJson('/api/v1/admin/assurances', ['pays' => 'CI', 'nom' => 'X', 'type' => 'privee'])->assertForbidden();
    });

    it('remplace toutes les assurances d\'une pharmacie (équipe)', function (): void {
        $ailleurs = creerAssurance(creerPays('CM', 'Africa/Douala'), 'Assureur camerounais');
        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->ville));
        $url = '/api/v1/admin/pharmacies/'.$this->a->id_public.'/assurances';

        $this->putJson($url, ['assurances' => [
            ['id' => $this->mugef->id_public, 'tiers_payant' => true, 'remarque' => 'Agents de l\'État seulement'],
            ['id' => $this->privee->id_public],
        ]])->assertOk()
            ->assertJsonCount(2, 'data.assurances')
            ->assertJsonPath('data.assurances.0.slug', 'mugef-ci')
            ->assertJsonPath('data.assurances.0.tiers_payant', true);

        expect($this->a->assurances()->pluck('slug')->sort()->values()->all())->toBe(['assureur-prive-a', 'mugef-ci']);

        $this->putJson($url, ['assurances' => [['id' => $ailleurs->id_public]]])
            ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    });

    it('laisse le pharmacien remplacer ses assurances et proposer celles qui manquent', function (): void {
        $pharmacien = creerCompte(Role::Pharmacien);
        $this->c->membres()->attach($pharmacien->id);
        Sanctum::actingAs($pharmacien);

        $this->putJson('/api/v1/pharmacien/pharmacie/assurances', [
            'assurances' => [['id' => $this->cmu->id_public, 'tiers_payant' => true]],
            'propositions' => ['Mutuelle des Transporteurs', 'mugef ci'],
        ])->assertOk()->assertJsonCount(2, 'data.assurances');

        // « mugef ci » a le slug d'une assurance connue : reliée directement ; l'autre attend l'équipe.
        $proposition = PropositionAssurance::query()->sole();
        expect($proposition->nom)->toBe('Mutuelle des Transporteurs')
            ->and($proposition->statut)->toBe(StatutProposition::EnAttente)
            ->and($proposition->pharmacie_id)->toBe($this->c->id);

        Sanctum::actingAs(creerCompte(Role::Admin));
        $this->postJson("/api/v1/admin/assurances/propositions/{$proposition->id_public}/accepter", ['type' => 'mutuelle'])
            ->assertOk()->assertJsonPath('data.statut', 'acceptee');
        expect(Assurance::query()->where('slug', 'mutuelle-des-transporteurs')->exists())->toBeTrue()
            ->and($this->c->assurances()->count())->toBe(3);
    });

    it('refuse l\'ancien champ assurances sur la fiche', function (): void {
        Sanctum::actingAs(creerCompte(Role::Admin));

        $this->patchJson('/api/v1/admin/pharmacies/'.$this->a->id_public, ['assurances' => ['CMU']])
            ->assertStatus(422)->assertJsonPath('error.details.assurances.0', 'Les assurances se modifient par la route dédiée PUT …/assurances.');
    });
});
