<?php

declare(strict_types=1);

use App\Modules\Gardes\Services\EntreeListeGarde;
use App\Modules\Gardes\Services\LectureListeGarde;
use App\Modules\Gardes\Services\PharmacieRapprochee;
use App\Modules\Gardes\Services\RapprochementListeGarde;
use App\Modules\Pharmacies\Models\Pharmacie;

/*
| Liste de garde de l'intérieur (semaine du 24 au 30 octobre 2026), telle que copiée après PDF24 :
| « / » lus « 1 », numéros abrégés ou coupés en fin de ligne, mentions « (NVLLE) », « SARL U ».
*/

function texteListeInterieur(): string
{
    return (string) file_get_contents(__DIR__.'/../Fixtures/liste-garde-interieur.txt');
}

function entreeListe(string $nom): EntreeListeGarde
{
    $entrees = (new LectureListeGarde)->lire(texteListeInterieur())->entrees;

    return collect($entrees)->firstOrFail(fn (EntreeListeGarde $e): bool => $e->nom === $nom);
}

it('lit la période, les villes et les pharmacies de la liste', function (): void {
    $liste = (new LectureListeGarde)->lire(texteListeInterieur());

    expect($liste->premierJour?->toDateString())->toBe('2026-10-24')
        ->and($liste->dernierJour?->toDateString())->toBe('2026-10-30')
        ->and($liste->entrees)->toHaveCount(19)
        ->and(array_values(array_unique(array_map(fn (EntreeListeGarde $e): ?string => $e->section, $liste->entrees))))
        ->toBe(['ABENGOUROU', 'ABOISSO', 'ADIAKE', 'ADZOPE', 'AGBOVILLE', 'BOUAFLE', 'BOUAKE', 'DANANE', 'DALOA']);

    $indenie = entreeListe("DE L'INDENIE");
    expect($indenie->pharmacien)->toBe('M. KOFFI JOSEPH')
        ->and($indenie->telephones)->toBe(['2735913604', '2735913382'])
        ->and($indenie->telephonesCorriges)->toBeFalse()
        ->and($indenie->repere)->toBe('VOIE PRINCIPALE A COTE DE LA GRANDE MOSQUEE');
});

it('corrige les barres lues « 1 » et signale la correction', function (): void {
    $moya = entreeListe('MOYA');

    expect($moya->telephones)->toBe(['0758094708', '0778969970'])
        ->and($moya->telephonesCorriges)->toBeTrue()
        ->and($moya->telephonesInvalides)->toBe([])
        ->and($moya->repere)->toBe('RUE PRINCESSE / PETIT BASSAM / DIOULAKRO SUD');
});

it('remplace les lettres prises pour des chiffres', function (): void {
    $entree = (new LectureListeGarde)->lire("BOUAKE PHCIE MOYA 1 M. WASSAAUGUSTE - TEL. 07 58 og 47 08107 78 96 99 701\nRUE PRINCESSE")->entrees[0];

    expect($entree->nom)->toBe('MOYA')
        ->and($entree->pharmacien)->toBe('M. WASSAAUGUSTE')
        ->and($entree->telephones)->toBe(['0758094708', '0778969970'])
        ->and($entree->telephonesCorriges)->toBeTrue();
});

it('recolle les numéros coupés en fin de ligne et retire les mentions du nom', function (): void {
    $gros = entreeListe('MARCHE DE GROS DE BOUAKE');
    expect($gros->telephones)->toBe(['2731601195', '0709899548', '0701680384', '2731654056'])
        ->and($gros->repere)->toBe('FACE MARCHE DE GROS');

    $nimbo = entreeListe('ST PIERRE NIMBO');
    expect($nimbo->nouvelle)->toBeTrue()
        ->and($nimbo->pharmacien)->toBe('M. MONPOEHO DE MODE SERGE CLAVER')
        ->and($nimbo->telephones)->toBe(['2731632263', '0703128171']);

    expect(entreeListe("NOTRE DAME DE L'ESPERANCE")->pharmacien)->toBe('MME KOUYATE CORINNE SIBA AHOUSSOU')
        ->and(entreeListe('FLOREL')->nouvelle)->toBeTrue()
        ->and(entreeListe("DE L'ALLIANCE")->telephones)->toBe(['0707087957']);
});

it('rend tel quel un numéro illisible', function (): void {
    $entree = (new LectureListeGarde)->lire('DALOA PHCIE DU PARVIS / M. AMANI - TEL. 27 32 78 / FACE MAIRIE')->entrees[0];

    expect($entree->telephones)->toBe([])
        ->and($entree->telephonesInvalides)->toBe(['273278'])
        ->and($entree->repere)->toBe('FACE MAIRIE');
});

it('reconnaît une ville connue seule sur sa ligne, et pas un repère', function (): void {
    $texte = "KORHOGO\nPHCIE DU NORD / M. A - TEL. 27 36 86 00 00\nQUARTIER SOBA\nPHCIE SOBA / M. B - TEL. 27 36 86 00 01";
    $entrees = (new LectureListeGarde)->lire($texte, ['Korhogo'])->entrees;

    expect($entrees)->toHaveCount(2)
        ->and($entrees[0]->section)->toBe('KORHOGO')
        ->and($entrees[1]->section)->toBe('KORHOGO')
        ->and($entrees[0]->repere)->toBe('QUARTIER SOBA');
});

describe('rapprochement avec l\'annuaire', function (): void {
    beforeEach(function (): void {
        $pays = creerPays();
        $abengourou = creerVille($pays, 'Abengourou');
        $bouake = creerVille($pays, 'Bouaké');

        $this->indenie = creerPharmacie($abengourou, ['nom' => "Pharmacie de l'Indénie"]);
        $this->moya = creerPharmacie($abengourou, ['nom' => 'Pharmacie Moya Centre', 'telephone' => '+2250758094708']);
        $this->prunelle = creerPharmacie($abengourou, ['nom' => 'Pharmacie Prunelle Marie', 'telephone' => '+2250102030405']);
        $this->saintPierre = creerPharmacie($bouake, ['nom' => 'Pharmacie Saint Pierre']);
        creerPharmacie($bouake, ['nom' => 'Pharmacie des Champs', 'actif' => false]);

        [, $resultats] = app(RapprochementListeGarde::class)->analyser(texteListeInterieur());
        $this->resultat = fn (string $nom): PharmacieRapprochee => collect($resultats)->firstOrFail(fn (PharmacieRapprochee $r): bool => $r->entree->nom === $nom);
    });

    it('trouve une fiche par son nom et propose d\'ajouter le numéro', function (): void {
        $r = ($this->resultat)("DE L'INDENIE");

        expect($r->statut)->toBe(PharmacieRapprochee::TROUVEE)
            ->and($r->methode)->toBe('nom')
            ->and($r->pharmacie?->is($this->indenie))->toBeTrue()
            ->and($r->alertes)->toBe([PharmacieRapprochee::TELEPHONE_A_AJOUTER]);
    });

    it('trouve une fiche par son téléphone, même sous un autre nom', function (): void {
        $r = ($this->resultat)('MOYA');

        expect($r->statut)->toBe(PharmacieRapprochee::TROUVEE)
            ->and($r->methode)->toBe('telephone')
            ->and($r->pharmacie?->is($this->moya))->toBeTrue()
            ->and($r->alertes)->toBe([PharmacieRapprochee::TELEPHONE_CORRIGE]);
    });

    it('signale un numéro différent de celui de la fiche', function (): void {
        $r = ($this->resultat)('PRUNELLE MARIE');

        expect($r->statut)->toBe(PharmacieRapprochee::TROUVEE)
            ->and($r->alertes)->toBe([PharmacieRapprochee::TELEPHONE_DIFFERENT]);
    });

    it('met à vérifier un nom approchant', function (): void {
        $r = ($this->resultat)('ST PIERRE NIMBO');

        expect($r->statut)->toBe(PharmacieRapprochee::A_VERIFIER)
            ->and($r->methode)->toBe('nom_approchant')
            ->and($r->pharmacie?->is($this->saintPierre))->toBeTrue();
    });

    it('laisse inconnues les pharmacies absentes, désactivées ou d\'une ville absente', function (): void {
        expect(($this->resultat)('DES CHAMPS')->statut)->toBe(PharmacieRapprochee::INCONNUE)
            ->and(($this->resultat)('SALEM')->statut)->toBe(PharmacieRapprochee::INCONNUE)
            ->and(($this->resultat)('SALEM')->alertes)->toContain(PharmacieRapprochee::VILLE_INCONNUE)
            ->and(($this->resultat)('SALEM')->villeId)->toBeNull();
    });

    it('n\'écrit rien en base', function (): void {
        expect(Pharmacie::query()->count())->toBe(5)
            ->and($this->indenie->fresh()->telephone)->toBeNull();
    });
});

it('affiche le bilan en ligne de commande', function (): void {
    creerVille(creerPays(), 'Abengourou');

    $this->artisan('gardes:analyser-liste', ['fichier' => __DIR__.'/../Fixtures/liste-garde-interieur.txt'])
        ->expectsOutputToContain('Période annoncée : du 24/10/2026 au 30/10/2026.')
        ->expectsOutputToContain('19 pharmacie(s) lue(s) : 0 trouvée(s), 0 à vérifier, 19 inconnue(s).')
        ->assertSuccessful();
});
