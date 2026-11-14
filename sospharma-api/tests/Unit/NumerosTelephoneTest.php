<?php

declare(strict_types=1);

use App\Commun\Support\NumerosTelephone;

it('lit plusieurs numéros séparés par une barre ou un trait vertical, dans l\'ordre', function (): void {
    $lus = NumerosTelephone::pour('+225')->lire('27 21 32 39 90 / 01 71 28 85 72 | 0758480789');

    expect($lus->numeros)->toBe(['+2252721323990', '+2250171288572', '+2250758480789'])
        ->and($lus->illisibles)->toBe([])
        ->and($lus->avertissements)->toBe([]);
});

it('recolle un numéro coupé par un séparateur et le signale', function (): void {
    $lus = NumerosTelephone::pour('+225')->lire('27 / 23 22 85 02 / 05 56 00 43 54 / 07 20 60 35 60');

    expect($lus->numeros)->toBe(['+2252723228502', '+2250556004354', '+2250720603560'])
        ->and($lus->illisibles)->toBe([])
        ->and($lus->avertissements)->toBe(['Numéro corrigé, à vérifier : « 27 / 23 22 85 02 » lu 27 23 22 85 02.']);
});

it('complète une fin abrégée sans avertissement, comme on l\'écrit d\'habitude', function (): void {
    $lus = NumerosTelephone::pour('+225')->lire('27 35 91 36 04/33 82');

    expect($lus->numeros)->toBe(['+2252735913604', '+2252735913382'])
        ->and($lus->avertissements)->toBe([]);
});

it('garde un numéro complet au début inhabituel, avec un avertissement', function (): void {
    $lus = NumerosTelephone::pour('+225')->lire('27 22 44 55 66 / 28 33 73 48 35');

    expect($lus->numeros)->toBe(['+2252722445566', '+2252833734835'])
        ->and($lus->avertissements)->toBe(['Numéro au début inhabituel, à vérifier : 28 33 73 48 35.']);
});

it('rend tel quel ce qu\'il ne sait pas lire', function (): void {
    $lus = NumerosTelephone::pour('+225')->lire('07 07 12 34 56 / 273 / voir le gérant');

    expect($lus->numeros)->toBe(['+2250707123456'])
        ->and($lus->illisibles)->toBe(['voir le gérant', '273']);
});

it('accepte le format international et un numéro étranger', function (): void {
    $lus = NumerosTelephone::pour('+225')->lire('+225 07 07 12 34 56 / 00225 0505050505 / +33 6 12 34 56 78');

    expect($lus->numeros)->toBe(['+2250707123456', '+2250505050505', '+33612345678']);
});

it('lit chaque morceau tel quel dans un pays au plan de numérotation inconnu', function (): void {
    $lus = NumerosTelephone::pour('+242')->lire('06 612 34 56 / 05 / +242 05 512 34 56');

    expect($lus->numeros)->toBe(['+242066123456', '+242055123456'])
        ->and($lus->illisibles)->toBe(['05'])
        ->and($lus->avertissements)->toBe([]);
});

it('compare deux écritures d\'un même numéro par ses dix derniers chiffres', function (): void {
    expect(NumerosTelephone::dixChiffres('+2250707123456'))->toBe(NumerosTelephone::dixChiffres('07 07 12 34 56'))
        ->and(NumerosTelephone::dixChiffres('185'))->toBeNull();
});

it('écrit pour un tableur un numéro que lire() rend à l\'identique, sans « + » en tête', function (string $indicatif, string $numero, string $ecrit, int $avertissements = 0): void {
    $numeros = NumerosTelephone::pour($indicatif);

    expect($numeros->pourTableur($numero))->toBe($ecrit)
        ->and($numeros->lire($ecrit)->numeros)->toBe([$numero])
        // Un numéro hors plan revient identique, toujours signalé « à vérifier » comme à la saisie.
        ->and($numeros->lire($ecrit)->avertissements)->toHaveCount($avertissements);
})->with([
    'fixe ivoirien' => ['+225', '+2252722496136', '27 22 49 61 36'],
    'mobile ivoirien' => ['+225', '+2250707000002', '07 07 00 00 02'],
    'numéro étranger' => ['+225', '+33612345678', '00 33 61 23 45 67 8'],
    'pays au plan inconnu' => ['+242', '+242066123456', '00 242 06 61 23 45 6'],
    'hors plan ivoirien (données de démonstration)' => ['+225', '+2250000000101', '00 225 00 00 00 01 01', 1],
    'début inhabituel' => ['+225', '+2252812345678', '00 225 28 12 34 56 78', 1],
]);
