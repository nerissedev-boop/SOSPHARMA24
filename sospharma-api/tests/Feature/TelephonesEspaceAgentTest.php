<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Pharmacies\Enums\OrigineTelephone;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Models\TelephonePharmacie;
use App\Modules\Pharmacies\Services\TelephonesPharmacie;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\Sanctum;

/*
| Numéros d'une fiche vus de l'espace agent (et du back-office) : lister, ajouter un numéro lu sur la
| devanture, dire lequel a WhatsApp, choisir le principal. Numéros fictifs.
*/

const STRUCTURE_TELEPHONE = ['id', 'numero', 'rang', 'principal', 'whatsapp', 'whatsapp_confirme_le', 'origine'];

beforeEach(function (): void {
    $this->travelTo(now()->parse('2026-11-14T21:30:00Z'));
    $this->abidjan = creerAbidjan();
    $this->yamoussoukro = creerVille($this->abidjan->pays, 'Yamoussoukro');
    $this->agent = creerAgent($this->abidjan);

    // Fiche à trois numéros, comme la liste de l'Ordre : le 2e annoncé WhatsApp par l'import, sans confirmation.
    $this->etoile = creerPharmacie($this->abidjan, ['id_public' => 'ph_etoile', 'nom' => 'Pharmacie de l\'Étoile', 'telephone' => '+2252722000001']);
    app(TelephonesPharmacie::class)->ajouter($this->etoile, ['+2250707000002', '+2250505000003'], OrigineTelephone::ListeGarde);
    app(TelephonesPharmacie::class)->ajouterWhatsapp($this->etoile, '+2250707000002', OrigineTelephone::Import);

    Sanctum::actingAs($this->agent);
});

function telephoneDe(Pharmacie $pharmacie, string $numero): TelephonePharmacie
{
    return $pharmacie->telephones()->where('numero', $numero)->sole();
}

/** @return list<string> numéros dans l'ordre des rangs */
function ordreDes(Pharmacie $pharmacie): array
{
    return $pharmacie->telephones()->pluck('numero')->all();
}

describe('GET /agent/pharmacies/{id}/telephones', function (): void {
    it('liste les numéros, le principal en premier, avec l\'état de WhatsApp', function (): void {
        $reponse = $this->getJson('/api/v1/agent/pharmacies/ph_etoile/telephones')
            ->assertOk()
            ->assertJsonStructure(['success', 'data' => ['*' => STRUCTURE_TELEPHONE], 'meta' => ['request_id', 'generated_at']])
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.numero', '+2252722000001')
            ->assertJsonPath('data.0.rang', 1)
            ->assertJsonPath('data.0.principal', true)
            ->assertJsonPath('data.0.origine', 'admin')
            ->assertJsonPath('data.1.numero', '+2250707000002')
            ->assertJsonPath('data.1.principal', false)
            ->assertJsonPath('data.1.whatsapp', true)
            ->assertJsonPath('data.1.whatsapp_confirme_le', null)
            ->assertJsonPath('data.1.origine', 'liste_garde');
        verifierMeta($reponse->json());

        expect($reponse->json('data.0.id'))->toStartWith('tl_');
    });

    it('demande une connexion', function (): void {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/agent/pharmacies/ph_etoile/telephones')
            ->assertUnauthorized()
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    });

    it('est réservée aux agents terrain', function (): void {
        Sanctum::actingAs(creerCompte(Role::Pharmacien));

        $this->getJson('/api/v1/agent/pharmacies/ph_etoile/telephones')
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');
    });

    it('refuse une pharmacie hors des villes de l\'agent', function (): void {
        $ailleurs = creerPharmacie($this->yamoussoukro, ['telephone' => '+2253064000001']);

        $this->getJson("/api/v1/agent/pharmacies/{$ailleurs->id_public}/telephones")
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');
    });

    it('répond 404 pour une pharmacie inconnue', function (): void {
        $this->getJson('/api/v1/agent/pharmacies/ph_inconnue/telephones')
            ->assertNotFound()->assertJsonPath('error.code', 'NOT_FOUND');
    });
});

describe('POST /agent/pharmacies/{id}/telephones', function (): void {
    it('ajoute un numéro lu sur la devanture à la suite, sans changer le principal', function (): void {
        $reponse = $this->postJson('/api/v1/agent/pharmacies/ph_etoile/telephones', ['numero' => '01 71 28 85 72'])
            ->assertCreated()
            ->assertJsonStructure(['success', 'data' => STRUCTURE_TELEPHONE, 'meta'])
            ->assertJsonPath('data.numero', '+2250171288572')
            ->assertJsonPath('data.rang', 4)
            ->assertJsonPath('data.principal', false)
            ->assertJsonPath('data.whatsapp', false)
            ->assertJsonPath('data.origine', 'agent');
        verifierMeta($reponse->json());
        $id = $reponse->json('data.id');

        $reponse->assertHeader('Location', url("/api/v1/agent/pharmacies/ph_etoile/telephones/{$id}"));
        $this->assertDatabaseHas('telephones_pharmacie', [
            'pharmacie_id' => $this->etoile->id, 'id_public' => $id, 'numero' => '+2250171288572', 'rang' => 4, 'origine' => 'agent',
        ]);
        expect($this->etoile->fresh()->telephone)->toBe('+2252722000001');
    });

    it('applique WhatsApp et principal donnés avec le numéro, signés par l\'agent', function (): void {
        $this->postJson('/api/v1/agent/pharmacies/ph_etoile/telephones', ['numero' => '+225 07 58 48 07 89', 'whatsapp' => true, 'principal' => true])
            ->assertCreated()
            ->assertJsonPath('data.rang', 1)
            ->assertJsonPath('data.whatsapp', true)
            ->assertJsonPath('data.whatsapp_confirme_le', '2026-11-14T21:30:00Z');

        $ligne = telephoneDe($this->etoile, '+2250758480789');
        expect($ligne->whatsapp_confirme_par)->toBe($this->agent->id)
            ->and(ordreDes($this->etoile))->toBe(['+2250758480789', '+2252722000001', '+2250707000002', '+2250505000003'])
            ->and($this->etoile->fresh()->telephone)->toBe('+2250758480789');
    });

    it('rend le numéro déjà présent au lieu de le doubler (renvoi après une coupure)', function (): void {
        $existant = telephoneDe($this->etoile, '+2250505000003');

        $this->postJson('/api/v1/agent/pharmacies/ph_etoile/telephones', ['numero' => '05 05 00 00 03', 'whatsapp' => false])
            ->assertOk()
            ->assertJsonPath('data.id', $existant->id_public)
            ->assertJsonPath('data.origine', 'liste_garde')
            ->assertJsonPath('data.whatsapp_confirme_le', '2026-11-14T21:30:00Z')
            ->assertJsonPath('meta.deja_present', true);

        expect($this->etoile->telephones()->count())->toBe(3);
    });

    it('fait du premier numéro d\'une fiche sans numéro son principal', function (): void {
        $sans = creerPharmacie($this->abidjan, ['nom' => 'Pharmacie sans numéro']);

        $this->postJson("/api/v1/agent/pharmacies/{$sans->id_public}/telephones", ['numero' => '0707123456'])
            ->assertCreated()->assertJsonPath('data.principal', true);

        expect($sans->fresh()->telephone)->toBe('+2250707123456');
    });

    it('refuse un numéro absent, illisible, incomplet ou double', function (array $corps, string $message): void {
        $this->postJson('/api/v1/agent/pharmacies/ph_etoile/telephones', $corps)
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonPath('error.details.numero.0', $message);

        expect($this->etoile->telephones()->count())->toBe(3);
    })->with([
        'absent' => [[], 'Le champ numero est obligatoire.'],
        'lettres' => [['numero' => '07 O7 12 34 56'], 'Le numéro ne doit contenir que des chiffres, par exemple 07 07 12 34 56.'],
        'incomplet' => [['numero' => '07 07 12'], 'Ce numéro n\'est pas reconnu. Saisissez-le en entier, par exemple 07 07 12 34 56.'],
        'début inhabituel' => [['numero' => '28 33 73 48 35'], 'Ce numéro n\'est pas reconnu. Saisissez-le en entier, par exemple 07 07 12 34 56.'],
        'deux numéros collés' => [['numero' => '07 07 12 34 56 05 05 12 34 56'], 'Un seul numéro à la fois.'],
    ]);

    it('refuse un WhatsApp qui n\'est pas un booléen', function (): void {
        $this->postJson('/api/v1/agent/pharmacies/ph_etoile/telephones', ['numero' => '0707123456', 'whatsapp' => 'peut-être'])
            ->assertUnprocessable()->assertJsonValidationErrors(['whatsapp'], 'error.details');
    });

    it('demande une connexion', function (): void {
        $this->app['auth']->forgetGuards();

        $this->postJson('/api/v1/agent/pharmacies/ph_etoile/telephones', ['numero' => '0707123456'])
            ->assertUnauthorized()->assertJsonPath('error.code', 'UNAUTHENTICATED');
    });

    it('refuse une pharmacie hors des villes de l\'agent, sans rien écrire', function (): void {
        $ailleurs = creerPharmacie($this->yamoussoukro);

        $this->postJson("/api/v1/agent/pharmacies/{$ailleurs->id_public}/telephones", ['numero' => '0707123456'])
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');

        expect($ailleurs->telephones()->count())->toBe(0);
    });

    it('répond 404 pour une pharmacie inconnue', function (): void {
        $this->postJson('/api/v1/agent/pharmacies/ph_inconnue/telephones', ['numero' => '0707123456'])->assertNotFound();
    });
});

describe('PATCH /agent/pharmacies/{id}/telephones/{tl}', function (): void {
    it('confirme WhatsApp sur un numéro, avec la date et l\'agent', function (): void {
        Log::spy();
        $troisieme = telephoneDe($this->etoile, '+2250505000003');

        $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$troisieme->id_public}", ['whatsapp' => true])
            ->assertOk()
            ->assertJsonStructure(['success', 'data' => STRUCTURE_TELEPHONE, 'meta'])
            ->assertJsonPath('data.whatsapp', true)
            ->assertJsonPath('data.whatsapp_confirme_le', '2026-11-14T21:30:00Z')
            ->assertJsonPath('data.rang', 3);

        $this->assertDatabaseHas('telephones_pharmacie', [
            'id' => $troisieme->id, 'whatsapp' => true, 'whatsapp_confirme_par' => $this->agent->id,
        ]);
        Log::shouldHaveReceived('info')->with('Numéro de pharmacie confirmé', Mockery::on(fn (array $contexte): bool => $contexte['telephone'] === $troisieme->id_public
            && $contexte['whatsapp'] === true && $contexte['compte_id'] === $this->agent->id && ! in_array('+2250505000003', $contexte, true)));
    });

    it('retire WhatsApp au seul numéro qui l\'avait : la fiche n\'a plus de WhatsApp, la réponse « non » est datée', function (): void {
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');
        expect($this->etoile->fresh()->whatsapp)->toBe('+2250707000002');

        $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}", ['whatsapp' => false])
            ->assertOk()
            ->assertJsonPath('data.whatsapp', false)
            ->assertJsonPath('data.whatsapp_confirme_le', '2026-11-14T21:30:00Z');

        expect($this->etoile->fresh()->whatsapp)->toBeNull();
        // Un import suivant ne remet pas WhatsApp sur ce numéro : une personne a répondu.
        app(TelephonesPharmacie::class)->ajouterWhatsapp($this->etoile->fresh(), '+2250707000002', OrigineTelephone::Import);
        expect(telephoneDe($this->etoile, '+2250707000002')->whatsapp)->toBeFalse();
    });

    it('choisit le principal ; les autres numéros gardent leur ordre derrière lui', function (): void {
        $troisieme = telephoneDe($this->etoile, '+2250505000003');

        $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$troisieme->id_public}", ['principal' => true])
            ->assertOk()
            ->assertJsonPath('data.rang', 1)
            ->assertJsonPath('data.principal', true)
            ->assertJsonPath('data.whatsapp_confirme_le', null);

        expect(ordreDes($this->etoile))->toBe(['+2250505000003', '+2252722000001', '+2250707000002'])
            ->and($this->etoile->fresh()->telephone)->toBe('+2250505000003');
    });

    it('ne change rien quand le numéro est déjà le principal', function (): void {
        $premier = telephoneDe($this->etoile, '+2252722000001');
        $avant = $premier->updated_at;
        $this->travel(5)->minutes();

        $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$premier->id_public}", ['principal' => true])
            ->assertOk()->assertJsonPath('data.rang', 1);

        expect(ordreDes($this->etoile))->toBe(['+2252722000001', '+2250707000002', '+2250505000003'])
            ->and($premier->fresh()->updated_at->equalTo($avant))->toBeTrue();
    });

    it('accepte la même réponse deux fois : seule la date de confirmation avance', function (): void {
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');
        $url = "/api/v1/agent/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}";

        $this->patchJson($url, ['whatsapp' => true])->assertOk();
        $this->travel(2)->days();
        $this->patchJson($url, ['whatsapp' => true])
            ->assertOk()
            ->assertJsonPath('data.whatsapp', true)
            ->assertJsonPath('data.whatsapp_confirme_le', '2026-11-16T21:30:00Z');

        expect($this->etoile->telephones()->where('whatsapp', true)->count())->toBe(1);
    });

    it('répond 404 pour le numéro d\'une autre pharmacie, sans rien modifier', function (): void {
        $voisine = creerPharmacie($this->abidjan, ['telephone' => '+2252722000099']);
        $numeroVoisin = telephoneDe($voisine, '+2252722000099');

        $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$numeroVoisin->id_public}", ['whatsapp' => true])
            ->assertNotFound()->assertJsonPath('error.code', 'NOT_FOUND');

        expect($numeroVoisin->fresh()->whatsapp)->toBeFalse()
            ->and($numeroVoisin->fresh()->whatsapp_confirme_le)->toBeNull();
    });

    it('répond 404 pour un numéro inconnu', function (): void {
        $this->patchJson('/api/v1/agent/pharmacies/ph_etoile/telephones/tl_inconnu', ['whatsapp' => true])->assertNotFound();
    });

    it('refuse une demande vide ou « principal: false »', function (array $corps, string $champ, string $message): void {
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');

        $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}", $corps)
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonPath("error.details.{$champ}.0", $message);

        expect(ordreDes($this->etoile))->toBe(['+2252722000001', '+2250707000002', '+2250505000003']);
    })->with([
        'vide' => [[], 'whatsapp', 'Indiquez si ce numéro a WhatsApp, ou s\'il devient le numéro principal.'],
        'principal faux' => [['principal' => false], 'principal', 'Pour changer de numéro principal, choisissez l\'autre numéro comme principal.'],
    ]);

    it('demande une connexion', function (): void {
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');
        $this->app['auth']->forgetGuards();

        $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}", ['whatsapp' => true])
            ->assertUnauthorized();
    });

    it('refuse un agent d\'une autre ville, sans rien modifier', function (): void {
        Sanctum::actingAs(creerAgent($this->yamoussoukro));
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');

        $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}", ['whatsapp' => false])
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');

        expect($deuxieme->fresh()->whatsapp)->toBeTrue();
    });
});

describe('back-office : mêmes routes sous /admin', function (): void {
    it('laisse un éditeur gérer les numéros de sa ville, en son nom', function (): void {
        $editeur = creerCompte(Role::EditeurVille, $this->abidjan);
        Sanctum::actingAs($editeur);

        $this->getJson('/api/v1/admin/pharmacies/ph_etoile/telephones')->assertOk()->assertJsonCount(3, 'data');
        $nouveau = $this->postJson('/api/v1/admin/pharmacies/ph_etoile/telephones', ['numero' => '0171288572', 'whatsapp' => true])
            ->assertCreated()
            ->assertHeader('Location')
            ->assertJsonPath('data.origine', 'admin')
            ->json('data.id');

        expect(TelephonePharmacie::query()->where('id_public', $nouveau)->sole()->whatsapp_confirme_par)->toBe($editeur->id);
    });

    it('refuse à un éditeur les numéros d\'une autre ville', function (): void {
        $ailleurs = creerPharmacie($this->yamoussoukro, ['telephone' => '+2253064000001']);
        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));

        $this->getJson("/api/v1/admin/pharmacies/{$ailleurs->id_public}/telephones")->assertForbidden();
        $this->patchJson("/api/v1/admin/pharmacies/{$ailleurs->id_public}/telephones/".telephoneDe($ailleurs, '+2253064000001')->id_public, ['principal' => true])
            ->assertForbidden();
    });

    it('n\'ouvre pas /admin aux agents terrain', function (): void {
        $this->getJson('/api/v1/admin/pharmacies/ph_etoile/telephones')->assertForbidden();
    });
});

it('parcours de l\'agent devant la pharmacie : la retrouver, vérifier ses numéros, et l\'app publique suit', function (): void {
    // 1. Doublons autour de lui : la fiche est là.
    $this->getJson('/api/v1/agent/pharmacies/proches?lat=5.355&lng=-3.970')
        ->assertOk()->assertJsonPath('data.0.id', 'ph_etoile');

    // 2. Ses numéros.
    $numeros = collect($this->getJson('/api/v1/agent/pharmacies/ph_etoile/telephones')->assertOk()->json('data'))->keyBy('numero');

    // 3. Le numéro affiché sur la vitrine manque : il l'ajoute, c'est le WhatsApp.
    $vitrine = $this->postJson('/api/v1/agent/pharmacies/ph_etoile/telephones', ['numero' => '07 58 48 07 89', 'whatsapp' => true])
        ->assertCreated()->json('data.id');

    // 4. Le numéro donné pour WhatsApp par l'import ne l'est pas.
    $this->patchJson('/api/v1/agent/pharmacies/ph_etoile/telephones/'.$numeros['+2250707000002']['id'], ['whatsapp' => false])->assertOk();

    // 5. Le fixe ne répond plus la nuit : le mobile de la vitrine devient le principal.
    $this->patchJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$vitrine}", ['principal' => true])->assertOk();

    // 6. La fiche publique (sans compte) montre le résultat.
    $this->app['auth']->forgetGuards();
    $this->getJson('/api/v1/pharmacies/ph_etoile')
        ->assertOk()
        ->assertJsonPath('data.telephone', '+2250758480789')
        ->assertJsonPath('data.whatsapp', '+2250758480789')
        ->assertJsonPath('data.telephones', [
            ['numero' => '+2250758480789', 'principal' => true, 'whatsapp' => true],
            ['numero' => '+2252722000001', 'principal' => false, 'whatsapp' => false],
            ['numero' => '+2250707000002', 'principal' => false, 'whatsapp' => false],
            ['numero' => '+2250505000003', 'principal' => false, 'whatsapp' => false],
        ]);
});

describe('DELETE /agent/pharmacies/{id}/telephones/{tl}', function (): void {
    it('retire un numéro faux, recompacte les rangs et suit sur la fiche', function (): void {
        Log::spy();
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');

        $this->deleteJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}")
            ->assertNoContent();

        $this->assertDatabaseMissing('telephones_pharmacie', ['id' => $deuxieme->id]);
        expect(ordreDes($this->etoile))->toBe(['+2252722000001', '+2250505000003'])
            ->and(telephoneDe($this->etoile, '+2250505000003')->rang)->toBe(2)
            ->and($this->etoile->fresh()->telephone)->toBe('+2252722000001')
            // C'était le seul numéro WhatsApp.
            ->and($this->etoile->fresh()->whatsapp)->toBeNull();
        Log::shouldHaveReceived('info')->with('Numéro de pharmacie retiré', Mockery::on(fn (array $contexte): bool => $contexte['telephone'] === $deuxieme->id_public
            && $contexte['pharmacie'] === 'ph_etoile' && $contexte['compte_id'] === $this->agent->id && ! in_array('+2250707000002', $contexte, true)));
    });

    it('refuse de retirer le principal tant qu\'il reste d\'autres numéros', function (): void {
        $premier = telephoneDe($this->etoile, '+2252722000001');

        $this->deleteJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$premier->id_public}")
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonPath('error.message', 'Ce numéro est le principal. Choisissez d\'abord un autre numéro principal, puis retirez celui-ci.');

        expect(ordreDes($this->etoile))->toBe(['+2252722000001', '+2250707000002', '+2250505000003']);
    });

    it('retire le dernier numéro : la fiche n\'a plus ni téléphone ni WhatsApp', function (): void {
        $seule = creerPharmacie($this->abidjan, ['telephone' => '+2250707123456', 'whatsapp' => '+2250707123456']);

        $this->deleteJson("/api/v1/agent/pharmacies/{$seule->id_public}/telephones/".telephoneDe($seule, '+2250707123456')->id_public)
            ->assertNoContent();

        expect($seule->telephones()->count())->toBe(0)
            ->and($seule->fresh()->telephone)->toBeNull()
            ->and($seule->fresh()->whatsapp)->toBeNull();
    });

    it('répond 404 pour le numéro d\'une autre pharmacie, et au second envoi', function (): void {
        $voisine = creerPharmacie($this->abidjan, ['telephone' => '+2252722000099']);
        $numeroVoisin = telephoneDe($voisine, '+2252722000099');
        $troisieme = telephoneDe($this->etoile, '+2250505000003');

        $this->deleteJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$numeroVoisin->id_public}")
            ->assertNotFound()->assertJsonPath('error.code', 'NOT_FOUND');
        expect($numeroVoisin->fresh())->not->toBeNull();

        $this->deleteJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$troisieme->id_public}")->assertNoContent();
        $this->deleteJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$troisieme->id_public}")->assertNotFound();
    });

    it('demande une connexion', function (): void {
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');
        $this->app['auth']->forgetGuards();

        $this->deleteJson("/api/v1/agent/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}")
            ->assertUnauthorized()->assertJsonPath('error.code', 'UNAUTHENTICATED');
        expect($deuxieme->fresh())->not->toBeNull();
    });

    it('refuse un agent d\'une autre ville et un pharmacien, sans rien retirer', function (): void {
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');
        $url = "/api/v1/agent/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}";

        Sanctum::actingAs(creerAgent($this->yamoussoukro));
        $this->deleteJson($url)->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');
        Sanctum::actingAs(creerCompte(Role::Pharmacien));
        $this->deleteJson($url)->assertForbidden();

        expect($deuxieme->fresh())->not->toBeNull();
    });

    it('est ouverte à l\'équipe sous /admin, éditeur limité à sa ville', function (): void {
        $deuxieme = telephoneDe($this->etoile, '+2250707000002');
        $ailleurs = creerPharmacie($this->yamoussoukro, ['telephone' => '+2253064000001']);
        Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->abidjan));

        $this->deleteJson("/api/v1/admin/pharmacies/{$ailleurs->id_public}/telephones/".telephoneDe($ailleurs, '+2253064000001')->id_public)
            ->assertForbidden();
        $this->deleteJson("/api/v1/admin/pharmacies/ph_etoile/telephones/{$deuxieme->id_public}")->assertNoContent();

        expect($this->etoile->telephones()->count())->toBe(2);
    });
});
