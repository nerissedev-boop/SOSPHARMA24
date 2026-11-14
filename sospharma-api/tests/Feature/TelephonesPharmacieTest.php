<?php

declare(strict_types=1);

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\Role;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Pharmacies\Enums\OrigineTelephone;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Models\TelephonePharmacie;
use App\Modules\Pharmacies\Services\TelephonesPharmacie;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

/*
| Plusieurs numéros par pharmacie : import CSV (fichier modèle réel de la liste du 31 octobre),
| liste de garde, colonnes historiques telephone / whatsapp, reprise des données et service.
*/

const COMMUNES_MODELE = ['Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon'];

beforeEach(function (): void {
    $this->ville = creerAbidjan();
    $this->admin = creerCompte(Role::Admin);
    Sanctum::actingAs($this->admin);
    $this->telephones = app(TelephonesPharmacie::class);
});

/** @return list<array{numero: string, rang: int, whatsapp: bool, origine: string}> */
function numerosDe(Pharmacie $pharmacie): array
{
    return $pharmacie->telephones()->get()
        ->map(fn (TelephonePharmacie $t): array => ['numero' => $t->numero, 'rang' => $t->rang, 'whatsapp' => $t->whatsapp, 'origine' => $t->origine->value])
        ->all();
}

function importerCsv(object $test, string $contenu, bool $simulation = false): array
{
    return $test->post('/api/v1/admin/pharmacies/import', [
        'ville' => 'vi_abj', 'fichier' => UploadedFile::fake()->createWithContent('pharmacies.csv', $contenu), 'simulation' => $simulation ? '1' : '0',
    ], ['Accept' => 'application/json'])->assertStatus($simulation ? 200 : 201)->json('data');
}

describe('import CSV', function (): void {
    it('lit le fichier modèle en simulation sans écarter une ligne à cause de ses numéros', function (): void {
        foreach (array_diff(COMMUNES_MODELE, ['Cocody', 'Plateau']) as $i => $nom) {
            creerZone($this->ville, $nom, [6.0 + $i, 6.5 + $i, -5.0, -4.5]);
        }
        $contenu = (string) file_get_contents(base_path('tests/Fixtures/pharmacies-modele-31-octobre-06-novembre-2026.csv'));

        $reponse = $this->post('/api/v1/admin/pharmacies/import', [
            'ville' => 'vi_abj', 'fichier' => UploadedFile::fake()->createWithContent('modele.csv', $contenu), 'simulation' => '1',
        ], ['Accept' => 'application/json'])->assertOk();
        verifierMeta($reponse->json());
        $bilan = $reponse->json('data');
        $parLigne = collect($bilan['lignes'])->keyBy('ligne');

        expect($bilan['lignes'])->toHaveCount(117)
            ->and($bilan['erreurs'])->toBe(0)
            ->and($bilan['creees'])->toBe(117)
            ->and(collect($bilan['lignes'])->sum(fn (array $l): int => count($l['valeurs']['telephones'])))->toBe(226)
            // Ligne 3 : « 27 / 23 22 85 02 / … », la coquille de saisie.
            ->and($parLigne[3]['action'])->toBe('creer')
            ->and($parLigne[3]['valeurs']['telephone'])->toBe('+2252723228502')
            ->and($parLigne[3]['valeurs']['telephones'])->toBe(['+2252723228502', '+2250556004354', '+2250720603560'])
            ->and($parLigne[3]['messages'])->toContain('Numéro corrigé, à vérifier : « 27 / 23 22 85 02 » lu 27 23 22 85 02.')
            // Ligne 28 : un numéro au début « 28 », gardé mais signalé.
            ->and($parLigne[28]['valeurs']['telephones'])->toBe(['+2250143208214', '+2252733734846', '+2252833734835'])
            ->and($parLigne[28]['messages'])->toContain('Numéro au début inhabituel, à vérifier : 28 33 73 48 35.')
            ->and($parLigne[2]['valeurs']['telephones'])->toBe(['+2252721323990', '+2250171288572', '+2250758480789'])
            ->and(TelephonePharmacie::query()->count())->toBe(0)
            ->and(Pharmacie::query()->count())->toBe(0);
    });

    it('enregistre tous les numéros dans l\'ordre du fichier, le premier en principal', function (): void {
        $bilan = importerCsv($this, "nom;telephone\nPharmacie Neuve;27 21 32 39 90 / 01 71 28 85 72 | 07 58 48 07 89\n");
        $fiche = Pharmacie::query()->where('nom', 'Pharmacie Neuve')->sole();

        expect($bilan['creees'])->toBe(1)
            ->and(numerosDe($fiche))->toBe([
                ['numero' => '+2252721323990', 'rang' => 1, 'whatsapp' => false, 'origine' => 'import'],
                ['numero' => '+2250171288572', 'rang' => 2, 'whatsapp' => false, 'origine' => 'import'],
                ['numero' => '+2250758480789', 'rang' => 3, 'whatsapp' => false, 'origine' => 'import'],
            ])
            ->and($fiche->telephone)->toBe('+2252721323990')
            ->and($fiche->whatsapp)->toBeNull();

        $this->getJson("/api/v1/pharmacies/{$fiche->id_public}")
            ->assertOk()
            ->assertJsonPath('data.telephone', '+2252721323990')
            ->assertJsonPath('data.whatsapp', null)
            ->assertJsonPath('data.telephones', [
                ['numero' => '+2252721323990', 'principal' => true, 'whatsapp' => false],
                ['numero' => '+2250171288572', 'principal' => false, 'whatsapp' => false],
                ['numero' => '+2250758480789', 'principal' => false, 'whatsapp' => false],
            ]);
    });

    it('met la ligne en erreur pour un numéro vraiment illisible, en le citant', function (): void {
        $bilan = importerCsv($this, "nom;telephone\nPharmacie Neuve;07 07 12 34 56 / 273\n", simulation: true);

        expect($bilan['erreurs'])->toBe(1)
            ->and($bilan['lignes'][0]['messages'])->toBe(['Téléphone illisible : « 273 ».']);
    });

    it('ajoute les numéros d\'une fiche existante sans en effacer et sans changer son principal', function (): void {
        $etoile = creerPharmacie($this->ville, ['id_public' => 'ph_etoile', 'nom' => 'Pharmacie de l\'Étoile', 'telephone' => '+2250707000001']);

        $apercu = importerCsv($this, "id;nom;telephone\nph_etoile;Etoile;05 05 05 05 05 / 07 07 00 00 01\n", simulation: true);
        expect($apercu['lignes'][0]['action'])->toBe('mettre_a_jour')
            ->and($apercu['lignes'][0]['changements'])->toBe(['telephones'])
            ->and($apercu['lignes'][0]['avant']['telephones'])->toBe(['+2250707000001']);

        importerCsv($this, "id;nom;telephone\nph_etoile;Etoile;05 05 05 05 05 / 07 07 00 00 01\n");
        expect(numerosDe($etoile))->toBe([
            ['numero' => '+2250707000001', 'rang' => 1, 'whatsapp' => false, 'origine' => 'admin'],
            ['numero' => '+2250505050505', 'rang' => 2, 'whatsapp' => false, 'origine' => 'import'],
        ])->and($etoile->fresh()->telephone)->toBe('+2250707000001');

        // Relancé : plus rien à ajouter ; une cellule vide n'efface rien.
        expect(importerCsv($this, "id;nom;telephone\nph_etoile;Etoile;07 07 00 00 01\n", simulation: true)['lignes'][0]['action'])->toBe('inchangee');
        importerCsv($this, "id;nom;telephone\nph_etoile;Etoile;\n");
        expect($etoile->telephones()->count())->toBe(2);
    });

    it('retrouve une fiche par son deuxième numéro, et signale un numéro partagé par deux fiches', function (): void {
        $etoile = creerPharmacie($this->ville, ['id_public' => 'ph_etoile', 'nom' => 'Pharmacie de l\'Étoile', 'telephone' => '+2250707000001']);
        $this->telephones->ajouter($etoile, ['+2250101010101'], OrigineTelephone::ListeGarde);

        $bilan = importerCsv($this, "nom;adresse;telephone\nPharmacie Etoile Riviera;Rue Z;01 01 01 01 01\n");
        expect($bilan['lignes'][0]['action'])->toBe('mettre_a_jour')
            ->and($bilan['lignes'][0]['methode'])->toBe('telephone')
            ->and($bilan['lignes'][0]['pharmacie']['id'])->toBe('ph_etoile')
            ->and($bilan['lignes'][0]['messages'][0])->toContain('Trouvée par le téléphone')
            ->and($etoile->fresh()->adresse)->toBe('Rue Z');

        $autre = creerPharmacie($this->ville, ['id_public' => 'ph_autre', 'nom' => 'Pharmacie Autre', 'telephone' => '+2250505050505']);
        $bilan = importerCsv($this, "nom;telephone\nPharmacie Groupement;05 05 05 05 05 / 01 01 01 01 01\n", simulation: true);
        expect($bilan['lignes'][0]['action'])->toBe('ambigue')
            ->and($bilan['lignes'][0]['messages'][0])->toContain('ph_etoile')
            ->and($bilan['lignes'][0]['messages'][0])->toContain($autre->id_public);
    });

    it('ajoute le numéro de la colonne whatsapp, marqué WhatsApp sans confirmation', function (): void {
        importerCsv($this, "nom;telephone;whatsapp\nPharmacie Wa;07 07 12 34 56;05 05 12 34 56\n");
        $fiche = Pharmacie::query()->where('nom', 'Pharmacie Wa')->sole();

        expect(numerosDe($fiche))->toBe([
            ['numero' => '+2250707123456', 'rang' => 1, 'whatsapp' => false, 'origine' => 'import'],
            ['numero' => '+2250505123456', 'rang' => 2, 'whatsapp' => true, 'origine' => 'import'],
        ])
            ->and($fiche->telephones()->where('whatsapp', true)->sole()->whatsapp_confirme_le)->toBeNull()
            ->and($fiche->whatsapp)->toBe('+2250505123456')
            ->and($fiche->telephone)->toBe('+2250707123456');
    });

    it('ne remet pas en cause une réponse WhatsApp donnée par une personne', function (): void {
        $fiche = creerPharmacie($this->ville, ['id_public' => 'ph_wa', 'nom' => 'Pharmacie Wa', 'telephone' => '+2250707123456']);
        $this->telephones->marquerWhatsapp($fiche, '+2250707123456', false, $this->admin);

        $bilan = importerCsv($this, "id;nom;whatsapp\nph_wa;Pharmacie Wa;07 07 12 34 56\n");

        expect($bilan['lignes'][0]['action'])->toBe('inchangee')
            ->and($fiche->fresh()->whatsapp)->toBeNull();
    });
});

describe('colonnes historiques', function (): void {
    it('recopie le principal et le premier numéro WhatsApp dans telephone et whatsapp', function (): void {
        $fiche = creerPharmacie($this->ville, ['telephone' => '+2250707000001']);
        $this->telephones->ajouter($fiche, ['+2250505000002', '+2250101000003'], OrigineTelephone::Agent);

        $this->telephones->definirPrincipal($fiche, '+2250101000003', OrigineTelephone::Agent);
        expect($fiche->fresh()->telephone)->toBe('+2250101000003')
            ->and($fiche->telephones()->pluck('numero')->all())->toBe(['+2250101000003', '+2250707000001', '+2250505000002']);

        $this->telephones->marquerWhatsapp($fiche, '+2250505000002', true, $this->admin);
        $this->telephones->marquerWhatsapp($fiche, '+2250707000001', true);
        expect($fiche->fresh()->whatsapp)->toBe('+2250707000001');

        $this->telephones->marquerWhatsapp($fiche, '+2250707000001', false);
        expect($fiche->fresh()->whatsapp)->toBe('+2250505000002');
    });

    it('fait passer la modification d\'une fiche par l\'admin par la liste des numéros', function (): void {
        $fiche = creerPharmacie($this->ville, ['telephone' => '+2250707000001', 'whatsapp' => '+2250707000001']);

        $reponse = $this->patchJson("/api/v1/admin/pharmacies/{$fiche->id_public}", ['telephone' => '+2252722445566', 'whatsapp' => '+2250707000001'])
            ->assertOk()
            ->assertJsonPath('data.telephone', '+2252722445566')
            ->assertJsonPath('data.whatsapp', '+2250707000001')
            ->assertJsonPath('data.telephones', [
                ['numero' => '+2252722445566', 'principal' => true, 'whatsapp' => false],
                ['numero' => '+2250707000001', 'principal' => false, 'whatsapp' => true],
            ]);
        verifierMeta($reponse->json());

        // Champ vidé : l'ancien principal est retiré, le suivant le remplace.
        $this->patchJson("/api/v1/admin/pharmacies/{$fiche->id_public}", ['telephone' => null, 'whatsapp' => null])
            ->assertOk()
            ->assertJsonPath('data.telephone', '+2250707000001')
            ->assertJsonPath('data.whatsapp', null);
        expect(numerosDe($fiche))->toBe([['numero' => '+2250707000001', 'rang' => 1, 'whatsapp' => false, 'origine' => 'admin']]);
    });

    it('enregistre le téléphone d\'un relevé terrain validé comme numéro principal, sans perdre l\'ancien', function (): void {
        $fiche = creerPharmacie($this->ville, ['telephone' => '+2250707000001']);

        app(EditionFichesPharmacies::class)->mettreAJour($fiche->id, ['telephone' => '+2250505000002', 'whatsapp' => '+2250505000002']);

        expect(numerosDe($fiche))->toBe([
            ['numero' => '+2250505000002', 'rang' => 1, 'whatsapp' => true, 'origine' => 'agent'],
            ['numero' => '+2250707000001', 'rang' => 2, 'whatsapp' => false, 'origine' => 'admin'],
        ])
            ->and($fiche->fresh()->telephone)->toBe('+2250505000002')
            ->and($fiche->fresh()->whatsapp)->toBe('+2250505000002');
    });
});

describe('service TelephonesPharmacie', function (): void {
    it('n\'ajoute pas deux fois le même numéro', function (): void {
        $fiche = creerPharmacie($this->ville);

        expect($this->telephones->ajouter($fiche, ['+2250707000001', '+2250707000001'], OrigineTelephone::Import))->toBe(['+2250707000001'])
            ->and($this->telephones->ajouter($fiche, ['+2250707000001'], OrigineTelephone::Import))->toBe([])
            ->and($fiche->telephones()->count())->toBe(1);
    });

    it('date et signe une réponse WhatsApp, et refuse un numéro absent de la fiche', function (): void {
        $fiche = creerPharmacie($this->ville, ['telephone' => '+2250707000001']);

        $this->telephones->marquerWhatsapp($fiche, '+2250707000001', true, $this->admin);
        $ligne = $fiche->telephones()->sole();
        expect($ligne->whatsapp)->toBeTrue()
            ->and($ligne->whatsapp_confirme_le)->not->toBeNull()
            ->and($ligne->whatsapp_confirme_par)->toBe($this->admin->id);

        // Une source non vérifiée ne touche pas à une réponse confirmée.
        expect($this->telephones->ajouterWhatsapp($fiche, '+2250707000001', OrigineTelephone::Import))->toBeFalse();

        expect(fn () => $this->telephones->marquerWhatsapp($fiche, '+2250999999999', true))->toThrow(DonneesInvalides::class);
    });
});

describe('liste de garde', function (): void {
    it('enregistre tous les numéros lus, sur une fiche créée comme sur une fiche complétée', function (): void {
        $cocody = Zone::query()->where('nom', 'Cocody')->firstOrFail();
        $lagunes = creerPharmacie($this->ville, ['nom' => 'Pharmacie des Lagunes', 'zone_id' => $cocody->id, 'telephone' => '+2250102030405']);
        $texte = "COCODY PHCIE DES LAGUNES / M. KOUASSI - TEL. 27 22 44 55 66 / 07 08 09 10 11 / RUE DES JARDINS\n"
            .'PLATEAU PHCIE DU COMMERCE / M. KONE - TEL. 27 20 21 22 23 / 05 06 07 08 09 / 01 99 88 77 66';

        $this->postJson('/api/v1/admin/listes-garde/import', ['texte' => $texte, 'annuaire_seulement' => true])
            ->assertCreated()
            ->assertJsonPath('data.fiches_creees', 1)
            ->assertJsonPath('data.telephones_completes', 2);

        expect(numerosDe($lagunes))->toBe([
            ['numero' => '+2250102030405', 'rang' => 1, 'whatsapp' => false, 'origine' => 'admin'],
            ['numero' => '+2252722445566', 'rang' => 2, 'whatsapp' => false, 'origine' => 'liste_garde'],
            ['numero' => '+2250708091011', 'rang' => 3, 'whatsapp' => false, 'origine' => 'liste_garde'],
        ])->and($lagunes->fresh()->telephone)->toBe('+2250102030405');

        $commerce = Pharmacie::query()->where('nom', 'Pharmacie du Commerce')->sole();
        expect($commerce->telephones()->pluck('numero')->all())->toBe(['+2252720212223', '+2250506070809', '+2250199887766'])
            ->and($commerce->telephone)->toBe('+2252720212223');
    });

    it('reconnaît une fiche par n\'importe lequel de ses numéros', function (): void {
        $fiche = creerPharmacie($this->ville, ['nom' => 'Pharmacie Sans Rapport', 'telephone' => '+2250102030405']);
        $this->telephones->ajouter($fiche, ['+2252722445566'], OrigineTelephone::Import);

        $this->postJson('/api/v1/admin/listes-garde/analyse', ['texte' => "SEMAINE DU SAMEDI 24 AU VENDREDI 30 OCTOBRE 2026\nCOCODY PHCIE DES LAGUNES / M. KOUASSI - TEL. 27 22 44 55 66"])
            ->assertOk()
            ->assertJsonPath('data.pharmacies.0.statut', 'trouvee')
            ->assertJsonPath('data.pharmacies.0.pharmacie.id', $fiche->id_public);
    });
});

describe('reprise des colonnes historiques', function (): void {
    it('transforme telephone et whatsapp en numéros, fusionnés s\'ils sont identiques', function (): void {
        $memes = creerPharmacie($this->ville);
        $distincts = creerPharmacie($this->ville);
        $whatsappSeul = creerPharmacie($this->ville);
        $sans = creerPharmacie($this->ville);
        // Les fiches telles qu'avant la table : colonnes remplies à la main, aucune ligne de numéro.
        DB::table('pharmacies')->where('id', $memes->id)->update(['telephone' => '+2250707000001', 'whatsapp' => '+2250707000001']);
        DB::table('pharmacies')->where('id', $distincts->id)->update(['telephone' => '+2252722445566', 'whatsapp' => '+2250505000002']);
        DB::table('pharmacies')->where('id', $whatsappSeul->id)->update(['whatsapp' => '+2250101000003']);
        $migration = require base_path('app/Modules/Pharmacies/database/migrations/2026_11_14_000320_reprendre_telephones_pharmacies.php');

        $migration->up();

        expect(numerosDe($memes))->toBe([['numero' => '+2250707000001', 'rang' => 1, 'whatsapp' => true, 'origine' => 'reprise']])
            ->and(numerosDe($distincts))->toBe([
                ['numero' => '+2252722445566', 'rang' => 1, 'whatsapp' => false, 'origine' => 'reprise'],
                ['numero' => '+2250505000002', 'rang' => 2, 'whatsapp' => true, 'origine' => 'reprise'],
            ])
            ->and(numerosDe($whatsappSeul))->toBe([['numero' => '+2250101000003', 'rang' => 1, 'whatsapp' => true, 'origine' => 'reprise']])
            ->and(numerosDe($sans))->toBe([])
            ->and($distincts->fresh()->telephone)->toBe('+2252722445566');

        $migration->down();
        expect(TelephonePharmacie::query()->count())->toBe(0);
    });
});
