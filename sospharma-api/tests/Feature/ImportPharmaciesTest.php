<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Pharmacies\Models\Pharmacie;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->ville = creerAbidjan();
    $this->etoile = creerPharmacie($this->ville, [
        'id_public' => 'ph_etoile', 'nom' => 'Pharmacie de l\'Étoile', 'telephone' => '+2250707000001', 'adresse' => 'Rue A',
    ]);
    $this->marche = creerPharmacie($this->ville, ['id_public' => 'ph_marche1', 'nom' => 'Pharmacie du Marché', 'latitude' => 5.355, 'longitude' => -3.970]);
    $this->marche2 = creerPharmacie($this->ville, ['id_public' => 'ph_marche2', 'nom' => 'Pharmacie du Marché', 'latitude' => 5.320, 'longitude' => -4.020]);
    Sanctum::actingAs(creerCompte(Role::Admin));
});

function fichierPharmacies(string $contenu): UploadedFile
{
    return UploadedFile::fake()->createWithContent('pharmacies.csv', $contenu);
}

function importerPharmacies(object $test, string $contenu, bool $simulation = false): array
{
    return $test->post('/api/v1/admin/pharmacies/import', [
        'ville' => 'vi_abj', 'fichier' => fichierPharmacies($contenu), 'simulation' => $simulation ? '1' : '0',
    ], ['Accept' => 'application/json'])->assertStatus($simulation ? 200 : 201)->json('data');
}

it('met à jour la fiche trouvée par le téléphone et crée la pharmacie inconnue', function (): void {
    $bilan = importerPharmacies($this, "nom;adresse;telephone;h24\nEtoile;Rue B;07 07 00 00 01;oui\nPharmacie Nouvelle Aube;;0505050505;\n");

    expect($bilan['mises_a_jour'])->toBe(1)
        ->and($bilan['creees'])->toBe(1)
        ->and($bilan['lignes'][0]['methode'])->toBe('telephone')
        ->and($bilan['lignes'][0]['changements'])->toBe(['adresse', 'h24'])
        ->and($this->etoile->fresh()->nom)->toBe("Pharmacie de l'Étoile")
        ->and($this->etoile->fresh()->adresse)->toBe('Rue B')
        ->and($this->etoile->fresh()->h24)->toBeTrue();

    $nouvelle = Pharmacie::query()->where('nom', 'Pharmacie Nouvelle Aube')->firstOrFail();
    expect($nouvelle->telephone)->toBe('+2250505050505')
        ->and($nouvelle->adresse)->toBe('Adresse à vérifier')
        ->and($nouvelle->aUnePosition())->toBeFalse()
        ->and($nouvelle->ville_id)->toBe($this->ville->id);
});

it('ne change rien en simulation', function (): void {
    $bilan = importerPharmacies($this, "nom;adresse\nPharmacie de l'Etoile;Rue C\nInconnue SARL;\n", simulation: true);

    expect($bilan['simulation'])->toBeTrue()
        ->and($bilan['mises_a_jour'])->toBe(1)
        ->and($bilan['creees'])->toBe(1)
        ->and($this->etoile->fresh()->adresse)->toBe('Rue A')
        ->and(Pharmacie::query()->count())->toBe(3);
});

it('départage deux homonymes par la position, sinon signale la ligne ambiguë', function (): void {
    $bilan = importerPharmacies($this, "nom;latitude;longitude;quartier\nDu Marché;5,3201;-4,0201;Plateau centre\nPharmacie du Marche;;;Riviera\n");

    expect($bilan['lignes'][0]['action'])->toBe('mettre_a_jour')
        ->and($bilan['lignes'][0]['pharmacie']['id'])->toBe('ph_marche2')
        ->and($bilan['lignes'][1]['action'])->toBe('ambigue')
        ->and($bilan['lignes'][1]['messages'][0])->toContain('ph_marche1')
        ->and($this->marche->fresh()->quartier)->toBeNull();
});

it('reconnaît la colonne id, laisse les cellules vides et signale une fiche inchangée', function (): void {
    $bilan = importerPharmacies($this, "id;nom;adresse;telephone\nph_etoile;Pharmacie de l'Étoile;;\nph_absente;X;;\n");

    expect($bilan['lignes'][0]['action'])->toBe('inchangee')
        ->and($bilan['lignes'][1]['action'])->toBe('erreur')
        ->and($this->etoile->fresh()->telephone)->toBe('+2250707000001');
});

it('écarte une ligne en erreur sans bloquer les autres', function (): void {
    $bilan = importerPharmacies($this, "nom;commune;assurances\nNouvelle A;cocody;\nNouvelle B;Atlantis;\nNouvelle C;;inconnue\n");

    expect($bilan['creees'])->toBe(1)
        ->and($bilan['erreurs'])->toBe(2)
        ->and($bilan['lignes'][1]['messages'][0])->toContain('Atlantis')
        ->and(Pharmacie::query()->where('nom', 'Nouvelle A')->firstOrFail()->zone?->nom)->toBe('Cocody');
});

it('renvoie pour l\'aperçu les valeurs lues et la valeur actuelle des champs qui changent', function (): void {
    $bilan = importerPharmacies($this, "nom;commune;adresse;telephone\nEtoile;cocody;Rue B;07 07 00 00 01\nPharmacie Neuve;Plateau;Rue N;05 05 05 05 05\n", simulation: true);

    expect($bilan['lignes'][0]['valeurs']['adresse'])->toBe('Rue B')
        ->and($bilan['lignes'][0]['valeurs']['commune'])->toBe('Cocody')
        ->and($bilan['lignes'][0]['valeurs']['telephone'])->toBe('+2250707000001')
        ->and($bilan['lignes'][0]['avant']['adresse'])->toBe('Rue A')
        ->and($bilan['lignes'][1]['action'])->toBe('creer')
        ->and($bilan['lignes'][1]['valeurs']['telephone'])->toBe('+2250505050505')
        ->and($bilan['lignes'][1])->not->toHaveKey('avant');
});

it('ignore les lignes de remarque qui commencent par #', function (): void {
    $bilan = importerPharmacies($this, "nom;adresse\nPharmacie Neuve;Rue N\n# À vérifier : Pharmacie Neuve, numéro illisible\n", simulation: true);

    expect($bilan['lignes'])->toHaveCount(1)->and($bilan['creees'])->toBe(1);
});

it('ne réécrit pas une adresse qui ne diffère que par la casse ou la ponctuation', function (): void {
    $this->etoile->update(['adresse' => 'RIVIERA III - FACE AU 12EME ARRONDISSEMENT']);

    $bilan = importerPharmacies($this, "id;nom;adresse\nph_etoile;Pharmacie de l'Étoile;Riviera III – face au 12eme arrondissement.\n", simulation: true);

    expect($bilan['lignes'][0]['action'])->toBe('inchangee');
});

it('laisse de côté les lignes retirées dans l\'aperçu, sans leur réserver de fiche', function (): void {
    $bilan = $this->post('/api/v1/admin/pharmacies/import', [
        'ville' => 'vi_abj',
        'fichier' => fichierPharmacies("nom;adresse;telephone\nEtoile fausse;Rue X;07 07 00 00 01\nEtoile;Rue B;07 07 00 00 01\nPharmacie Inventée;;\n"),
        'simulation' => '0',
        'exclure' => [2, 4],
    ], ['Accept' => 'application/json'])->assertCreated()->json('data');

    expect($bilan['retirees'])->toBe(2)
        ->and($bilan['lignes'][0]['action'])->toBe('retiree')
        // Sans la ligne 2, la ligne 3 prend la fiche de l'Étoile au lieu d'être écartée comme doublon.
        ->and($bilan['lignes'][1]['action'])->toBe('mettre_a_jour')
        ->and($this->etoile->fresh()->adresse)->toBe('Rue B')
        ->and(Pharmacie::query()->where('nom', 'Pharmacie Inventée')->exists())->toBeFalse();
});

it('garde la fiche dans la ville de l\'import quand la nouvelle position tombe dans une commune d\'une autre ville', function (): void {
    $bingerville = creerVille($this->ville->pays, 'Bingerville', idPublic: 'vi_bgv');
    creerZone($bingerville, 'Bingerville centre', [5.340, 5.370, -3.900, -3.870]);

    $bilan = importerPharmacies($this, "id;nom;latitude;longitude\nph_etoile;Pharmacie de l'Étoile;5,355;-3,885\n");

    expect($bilan['lignes'][0]['action'])->toBe('mettre_a_jour')
        ->and($this->etoile->fresh()->ville_id)->toBe($this->ville->id);
});
