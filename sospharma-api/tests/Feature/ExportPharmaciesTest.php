<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Pharmacies\Enums\OrigineTelephone;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\TelephonesPharmacie;
use App\Modules\Territoire\Enums\TypeZone;
use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->ville = creerAbidjan();
    $cocody = $this->ville->zones()->where('nom', 'Cocody')->firstOrFail();
    $plateau = $this->ville->zones()->where('nom', 'Plateau')->firstOrFail();
    // Un quartier homonyme de la commune : le nom seul ne suffirait plus à la retrouver au réimport.
    creerZone($this->ville, 'Plateau', [5.320, 5.330, -4.030, -4.020], TypeZone::Quartier);
    $this->admin = creerCompte(Role::Admin);

    $pays = $this->ville->pays;
    $cmu = creerAssurance($pays, 'CMU', slug: 'cmu');
    $mugef = creerAssurance($pays, 'MUGEF-CI', slug: 'mugef-ci');
    $retiree = creerAssurance($pays, 'Ancienne mutuelle', slug: 'ancienne', actif: false);

    $this->etoile = creerPharmacie($this->ville, [
        'id_public' => 'ph_etoile', 'nom' => 'Pharmacie de l\'Étoile', 'zone_id' => $cocody->id, 'quartier' => 'Riviera 2',
        'adresse' => 'Face au marché; près du "grand carrefour"', 'h24' => true, 'services' => ['Parapharmacie', 'Orthopédie'],
        'telephone' => '+2252722496136',
    ]);
    // Second numéro, WhatsApp vérifié sur place par une personne.
    app(TelephonesPharmacie::class)->enregistrer($this->etoile, '+2250707000002', true, false, $this->admin, OrigineTelephone::Admin);
    lierAssurances($this->etoile, $mugef, $cmu, $retiree);

    $this->belAir = creerPharmacie($this->ville, [
        'id_public' => 'ph_belair', 'nom' => 'Pharmacie Bel Air', 'adresse' => 'Adresse à vérifier', 'latitude' => null, 'longitude' => null,
        // Numéro hors plan ivoirien, comme ceux des données de démonstration.
        'telephone' => '+2250000000101',
    ]);

    // Cellules qu'un tableur prendrait pour des formules, retour à la ligne, numéro étranger, fiche désactivée.
    $this->saintJean = creerPharmacie($this->ville, [
        'id_public' => 'ph_stjean', 'nom' => 'Pharmacie Saint-Jean', 'zone_id' => $plateau->id, 'adresse' => "@Carrefour Duncan\nPorte 2",
        'services' => ['=Livraison', 'Vaccins'], 'telephone' => '+33612345678', 'whatsapp' => '+2250505050505', 'actif' => false,
    ]);

    $this->bouake = creerVille($pays, 'Bouaké', idPublic: 'vi_bke');
    creerPharmacie($this->bouake, ['id_public' => 'ph_bouake', 'nom' => 'Pharmacie du Grand Marché']);
});

function exporterPharmacies(object $test, string $parametres = ''): TestResponse
{
    return $test->get('/api/v1/admin/pharmacies/export'.$parametres, ['Accept' => 'application/json']);
}

/** @return list<list<string>> lignes du CSV, en-tête compris */
function lireExport(string $contenu): array
{
    $contenu = preg_replace('/^\xEF\xBB\xBF/', '', $contenu) ?? '';

    return array_map(fn (string $l): array => str_getcsv($l, ';', '"', ''), explode("\n", rtrim($contenu, "\n")));
}

function reimporter(object $test, string $contenu): array
{
    return $test->post('/api/v1/admin/pharmacies/import', [
        'ville' => 'vi_abj', 'fichier' => UploadedFile::fake()->createWithContent('pharmacies.csv', $contenu), 'simulation' => '1',
    ], ['Accept' => 'application/json'])->assertOk()->json('data');
}

it('réimporte l\'export sans retouche : toutes les lignes inchangées, puis une cellule modifiée donne une mise à jour', function (): void {
    Sanctum::actingAs($this->admin);
    $contenu = exporterPharmacies($this, '?filter[ville]=vi_abj')->assertOk()->streamedContent();

    $bilan = reimporter($this, $contenu);
    expect($bilan['inchangees'])->toBe(3)
        ->and([$bilan['creees'], $bilan['mises_a_jour'], $bilan['ambigues'], $bilan['erreurs']])->toBe([0, 0, 0, 0])
        ->and(collect($bilan['lignes'])->pluck('methode')->unique()->all())->toBe(['id']);

    $bilan = reimporter($this, str_replace('Riviera 2', 'Riviera 3', $contenu));
    expect($bilan['mises_a_jour'])->toBe(1)
        ->and($bilan['inchangees'])->toBe(2)
        ->and($bilan['erreurs'])->toBe(0)
        ->and(collect($bilan['lignes'])->firstWhere('action', 'mettre_a_jour'))
        ->pharmacie->toBe(['id' => 'ph_etoile', 'nom' => 'Pharmacie de l\'Étoile'])
        ->changements->toBe(['quartier']);
});

it('écrit un CSV pour Excel : BOM, point-virgule, colonnes de l\'import, numéros lisibles et cellules neutralisées', function (): void {
    Sanctum::actingAs($this->admin);
    $reponse = exporterPharmacies($this, '?filter[ville]=vi_abj')->assertOk()
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
        ->assertHeader('Content-Disposition', 'attachment; filename="pharmacies-abidjan-'.now()->format('Y-m-d').'.csv"');
    $contenu = $reponse->streamedContent();
    $lignes = lireExport($contenu);
    $parId = collect(array_slice($lignes, 1))->keyBy(0);
    $quartierPlateau = $this->ville->zones()->where('nom', 'Plateau')->where('type', TypeZone::Commune)->value('id_public');

    expect($contenu)->toStartWith("\xEF\xBB\xBFid;nom;adresse;")
        ->and($lignes[0])->toBe(['id', 'nom', 'adresse', 'quartier', 'commune', 'telephone', 'whatsapp', 'latitude', 'longitude', 'h24', 'services', 'assurances'])
        ->and($lignes)->toHaveCount(4)
        ->and($parId['ph_etoile'])->toBe([
            'ph_etoile', 'Pharmacie de l\'Étoile', 'Face au marché; près du "grand carrefour"', 'Riviera 2', 'Cocody',
            '27 22 49 61 36 / 07 07 00 00 02', '07 07 00 00 02', '5.355000', '-3.970000', 'oui', 'Parapharmacie | Orthopédie', 'cmu | mugef-ci',
        ])
        ->and($parId['ph_belair'])->toBe(['ph_belair', 'Pharmacie Bel Air', 'Adresse à vérifier', '', '', '00 225 00 00 00 01 01', '', '', '', 'non', '', ''])
        ->and($parId['ph_stjean'])->toBe([
            'ph_stjean', 'Pharmacie Saint-Jean', "'@Carrefour Duncan Porte 2", '', $quartierPlateau,
            '00 33 61 23 45 67 8 / 05 05 05 05 05', '05 05 05 05 05', '5.355000', '-3.970000', 'non', "'=Livraison | Vaccins", '',
        ]);
});

it('exporte toutes les villes pour l\'admin sans filtre de ville', function (): void {
    Sanctum::actingAs($this->admin);
    $reponse = exporterPharmacies($this)->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename="pharmacies-toutes-'.now()->format('Y-m-d').'.csv"');

    expect(array_column(array_slice(lireExport($reponse->streamedContent()), 1), 0))
        ->toEqualCanonicalizing(['ph_belair', 'ph_etoile', 'ph_bouake', 'ph_stjean']);
});

it('laisse le back-office, sur une autre origine, lire le nom du fichier', function (): void {
    Sanctum::actingAs($this->admin);
    $origine = config('cors.allowed_origins')[0];

    $reponse = $this->get('/api/v1/admin/pharmacies/export', ['Accept' => 'application/json', 'Origin' => $origine])->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', $origine);

    expect(explode(',', str_replace(' ', '', (string) $reponse->headers->get('Access-Control-Expose-Headers'))))->toContain('Content-Disposition');
});

it('suit le tri demandé', function (): void {
    Sanctum::actingAs($this->admin);
    $ids = fn (string $sort): array => array_column(array_slice(lireExport(exporterPharmacies($this, '?filter[ville]=vi_abj&sort='.$sort)->assertOk()->streamedContent()), 1), 0);

    expect($ids('-nom'))->toBe(array_reverse($ids('nom')))->toHaveCount(3);
});

it('limite l\'éditeur de ville à sa ville, même s\'il en demande une autre', function (): void {
    Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->bouake));

    $sienne = exporterPharmacies($this)->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename="pharmacies-bouake-'.now()->format('Y-m-d').'.csv"');
    expect(array_column(array_slice(lireExport($sienne->streamedContent()), 1), 0))->toBe(['ph_bouake']);

    $autre = exporterPharmacies($this, '?filter[ville]=vi_abj')->assertOk();
    expect(lireExport($autre->streamedContent()))->toHaveCount(1);
});

it('applique les filtres, la recherche et le tri de la liste', function (string $parametres, array $ids): void {
    Sanctum::actingAs($this->admin);
    $contenu = exporterPharmacies($this, $parametres)->assertOk()->streamedContent();

    expect(array_column(array_slice(lireExport($contenu), 1), 0))->toBe($ids);
})->with([
    'désactivées' => ['?filter[ville]=vi_abj&filter[actif]=false', ['ph_stjean']],
    '24h/24' => ['?filter[h24]=true', ['ph_etoile']],
    'assurance' => ['?filter[assurances]=cmu', ['ph_etoile']],
    'commune' => ['?filter[zone]=zo_inconnue', []],
    'recherche' => ['?q=bel', ['ph_belair']],
    'recherche et ville' => ['?filter[ville]=vi_bke&q=grand', ['ph_bouake']],
]);

it('refuse un filtre ou un tri inconnu, ou une valeur invalide, comme la liste', function (string $parametres): void {
    Sanctum::actingAs($this->admin);

    exporterPharmacies($this, $parametres)->assertStatus(400)->assertJsonPath('error.code', 'BAD_REQUEST');
})->with(['?filter[statut]=ouverte', '?filter[actif]=peut-etre', '?sort=telephone', '?filter[assurances]=CMU%20!', '?q=a']);

it('demande une connexion', function (): void {
    exporterPharmacies($this)->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHENTICATED');
});

it('est réservé à l\'équipe', function (Role $role): void {
    Sanctum::actingAs($role === Role::AgentTerrain ? creerAgent($this->ville) : creerCompte($role));

    exporterPharmacies($this)->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
})->with([Role::Pharmacien, Role::AgentTerrain]);

it('ne modifie aucune fiche', function (): void {
    Sanctum::actingAs($this->admin);
    $avant = Pharmacie::query()->orderBy('id')->get()->toArray();

    exporterPharmacies($this)->assertOk()->streamedContent();

    expect(Pharmacie::query()->orderBy('id')->get()->toArray())->toBe($avant);
});
