<?php

declare(strict_types=1);

use App\Commun\Geo\Distance;
use App\Commun\Geo\Geometrie;

it('calcule une distance haversine réaliste', function (): void {
    // Un degré de latitude ≈ 111,2 km.
    expect(Distance::haversine(5.0, -4.0, 6.0, -4.0))->toBeGreaterThan(111_000.0)->toBeLessThan(111_400.0)
        ->and(Distance::metres(5.3, -4.0, 5.3, -4.0))->toBe(0);
});

it('estime le temps de marche à 80 m par minute', function (): void {
    expect(Distance::marcheMinutes(700))->toBe(9)
        ->and(Distance::marcheMinutes(80))->toBe(1)
        ->and(Distance::marcheMinutes(0))->toBe(1);
});

it('construit un rectangle de présélection qui contient le cercle', function (): void {
    $rectangle = Distance::rectangle(5.35, -4.0, 2000);

    foreach ([0, 90, 180, 270] as $angle) {
        $lat = 5.35 + rad2deg(1999 / 6_371_000) * cos(deg2rad($angle));
        $lng = -4.0 + rad2deg(1999 / (6_371_000 * cos(deg2rad(5.35)))) * sin(deg2rad($angle));
        expect($rectangle->contient($lat, $lng))->toBeTrue();
    }
    expect($rectangle->contient(5.40, -4.0))->toBeFalse();
});

it('teste le point dans un polygone avec trou', function (): void {
    $polygone = ['type' => 'Polygon', 'coordinates' => [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
    ]];

    expect(Geometrie::contientPoint($polygone, 2, 2))->toBeTrue()
        ->and(Geometrie::contientPoint($polygone, 5, 5))->toBeFalse() // dans le trou
        ->and(Geometrie::contientPoint($polygone, 11, 5))->toBeFalse();
});

it('gère les MultiPolygon et les Feature', function (): void {
    $feature = ['type' => 'Feature', 'properties' => [], 'geometry' => ['type' => 'MultiPolygon', 'coordinates' => [
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        [[[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]],
    ]]];

    expect(Geometrie::contientPoint($feature, 5.5, 5.5))->toBeTrue()
        ->and(Geometrie::contientPoint($feature, 3, 3))->toBeFalse();

    $bbox = Geometrie::rectangleEnglobant($feature);
    expect([$bbox->minLat, $bbox->maxLat, $bbox->minLng, $bbox->maxLng])->toBe([0.0, 6.0, 0.0, 6.0]);
});

it('refuse un contour invalide', function (): void {
    Geometrie::normaliser(['type' => 'Point', 'coordinates' => [0, 0]]);
})->throws(InvalidArgumentException::class);
