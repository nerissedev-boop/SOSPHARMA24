<?php

declare(strict_types=1);

use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\ImportPharmaciesOsm;

/*
| Réponse Overpass fictive (out tags center) : Cocody et Plateau d'après creerAbidjan().
*/

function elementOsm(int $id, ?string $nom, float $lat, float $lng, array $tags = [], string $type = 'node'): array
{
    $element = ['type' => $type, 'id' => $id, 'tags' => array_filter(['amenity' => 'pharmacy', 'name' => $nom] + $tags)];

    return $type === 'node' ? $element + ['lat' => $lat, 'lon' => $lng] : $element + ['center' => ['lat' => $lat, 'lon' => $lng]];
}

beforeEach(function (): void {
    $this->ville = creerAbidjan();
    $this->import = app(ImportPharmaciesOsm::class);
});

it('crée des fiches à vérifier, rattachées à leur commune', function (): void {
    $bilan = $this->import->importer([
        elementOsm(101, 'Pharmacie des Lagunes', 5.355, -3.970, ['phone' => '+225 27 22 44 55 66', 'addr:street' => 'Rue des Jardins', 'addr:housenumber' => '12']),
        elementOsm(202, 'Grande Pharmacie du Plateau', 5.320, -4.020, ['opening_hours' => '24/7'], 'way'),
    ]);

    expect($bilan)->toMatchArray(['creees' => 2, 'hors_zone' => 0, 'sans_nom' => 0]);

    $lagunes = Pharmacie::query()->where('osm_id', 'n101')->firstOrFail();
    expect($lagunes->nom)->toBe('Pharmacie des Lagunes')
        ->and($lagunes->telephone)->toBe('+2252722445566')
        ->and($lagunes->adresse)->toBe('12 Rue des Jardins')
        ->and($lagunes->zone->nom)->toBe('Cocody')
        ->and($lagunes->verifiee_le)->toBeNull()
        ->and($lagunes->id_public)->toStartWith('ph_');

    $plateau = Pharmacie::query()->where('osm_id', 'w202')->firstOrFail();
    expect($plateau->zone->nom)->toBe('Plateau')
        ->and($plateau->h24)->toBeTrue()
        ->and($plateau->adresse)->toBe(ImportPharmaciesOsm::ADRESSE_INCONNUE);
});

it('ignore les éléments sans nom ou hors des communes connues', function (): void {
    $bilan = $this->import->importer([
        elementOsm(1, null, 5.355, -3.970),
        elementOsm(2, 'Pharmacie de Bouaké', 7.690, -5.030),
    ]);

    expect($bilan)->toMatchArray(['creees' => 0, 'sans_nom' => 1, 'hors_zone' => 1])
        ->and(Pharmacie::query()->count())->toBe(0);
});

it('se relance sans doublon et ne touche plus une fiche vérifiée', function (): void {
    $this->import->importer([elementOsm(101, 'Pharmacie des Lagunes', 5.355, -3.970)]);
    $bilan = $this->import->importer([elementOsm(101, 'Pharmacie des Lagunes 2', 5.355, -3.970)]);

    expect($bilan['mises_a_jour'])->toBe(1)
        ->and(Pharmacie::query()->count())->toBe(1)
        ->and(Pharmacie::query()->value('nom'))->toBe('Pharmacie des Lagunes 2');

    Pharmacie::query()->update(['verifiee_le' => now(), 'nom' => 'Pharmacie des Lagunes (vérifiée)']);
    $bilan = $this->import->importer([elementOsm(101, 'Autre nom', 5.355, -3.970)]);

    expect($bilan['verifiees_intactes'])->toBe(1)
        ->and(Pharmacie::query()->value('nom'))->toBe('Pharmacie des Lagunes (vérifiée)');
});

it('rattache une fiche existante proche et de même nom au lieu de la dupliquer', function (): void {
    $existante = creerPharmacie($this->ville, ['nom' => 'Pharmacie Les Lagunes', 'latitude' => 5.3552, 'longitude' => -3.9701, 'telephone' => '+2250000000101']);

    $bilan = $this->import->importer([elementOsm(101, 'Pharmacie des Lagunes', 5.355, -3.970, ['phone' => '+225 01 02 03 04 05'])]);

    expect($bilan)->toMatchArray(['rattachees' => 1, 'creees' => 0])
        ->and(Pharmacie::query()->count())->toBe(1);
    $existante->refresh();
    expect($existante->osm_id)->toBe('n101')
        // Les données saisies par l'équipe priment : le téléphone existant reste.
        ->and($existante->telephone)->toBe('+2250000000101')
        ->and($existante->nom)->toBe('Pharmacie Les Lagunes');
});

it('crée une seconde fiche quand le nom diffère, même tout près', function (): void {
    creerPharmacie($this->ville, ['nom' => 'Pharmacie Saint-Jean', 'latitude' => 5.3551, 'longitude' => -3.9700]);

    expect($this->import->importer([elementOsm(101, 'Pharmacie des Lagunes', 5.355, -3.970)])['creees'])->toBe(1);
});

it('préfixe « Pharmacie » quand le nom OSM ne le dit pas, et normalise les numéros locaux', function (): void {
    $this->import->importer([elementOsm(5, 'du Golf', 5.360, -3.960, ['contact:phone' => '07 08 09 10 11; 05 00 00 00 00'])]);

    $p = Pharmacie::query()->firstOrFail();
    expect($p->nom)->toBe('Pharmacie du Golf')
        ->and($p->telephone)->toBe('+2250708091011');
});

it('simulation : compte sans rien écrire', function (): void {
    $bilan = $this->import->importer([elementOsm(101, 'Pharmacie des Lagunes', 5.355, -3.970)], simulation: true);

    expect($bilan['creees'])->toBe(1)
        ->and(Pharmacie::query()->count())->toBe(0);
});

it('commande : lit un fichier Overpass et affiche le bilan', function (): void {
    $fichier = tempnam(sys_get_temp_dir(), 'osm');
    file_put_contents($fichier, json_encode(['elements' => [elementOsm(101, 'Pharmacie des Lagunes', 5.355, -3.970)]]));

    $this->artisan('pharmacies:importer-osm', ['fichier' => $fichier])
        ->expectsOutputToContain('1 élément(s) OpenStreetMap lu(s)')
        ->assertSuccessful();

    expect(Pharmacie::query()->where('osm_id', 'n101')->exists())->toBeTrue();
    unlink($fichier);
});

it('commande : refuse un fichier qui n\'est pas une réponse Overpass', function (): void {
    $fichier = tempnam(sys_get_temp_dir(), 'osm');
    file_put_contents($fichier, '{"autre":1}');

    $this->artisan('pharmacies:importer-osm', ['fichier' => $fichier])->assertFailed();
    unlink($fichier);
});

it('commande : --desactiver-test retire des listes les pharmacies fictives, pas les autres', function (): void {
    $test = creerPharmacie($this->ville, ['id_public' => 'ph_test01', 'nom' => 'Pharmacie Alpha (test)']);
    $vraie = creerPharmacie($this->ville, ['nom' => 'Pharmacie réelle']);
    $fichier = tempnam(sys_get_temp_dir(), 'osm');
    file_put_contents($fichier, json_encode(['elements' => []]));

    $this->artisan('pharmacies:importer-osm', ['fichier' => $fichier, '--desactiver-test' => true])
        ->expectsOutputToContain('Pharmacies de test retirées des listes')
        ->assertSuccessful();

    expect($test->refresh()->actif)->toBeFalse()
        ->and($vraie->refresh()->actif)->toBeTrue();
    unlink($fichier);
});
