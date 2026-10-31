<?php

declare(strict_types=1);

use App\Modules\Pharmacies\Services\StatutPharmacie;
use Carbon\CarbonImmutable;

/*
| Les cas partagés avec l'app mobile (tests/Fixtures/cas-statut.json, copie de specs/cas-statut.json) :
| les deux implémentations de la règle doivent donner le même résultat.
*/

dataset('cas-statut', function (): array {
    $fichier = json_decode((string) file_get_contents(__DIR__.'/../Fixtures/cas-statut.json'), true, 512, JSON_THROW_ON_ERROR);

    $cas = [];
    foreach ($fichier['cas'] as $c) {
        $cas[$c['nom']] = [$c];
    }

    return $cas;
});

it('applique la règle de statut', function (array $cas): void {
    $gardes = array_map(fn (array $g): array => [
        'debut' => CarbonImmutable::parse($g['debut']),
        'fin' => CarbonImmutable::parse($g['fin']),
    ], $cas['pharmacie']['gardes']);

    $resultat = (new StatutPharmacie)->calculer(
        $cas['pharmacie']['h24'],
        $cas['pharmacie']['horaires'],
        $gardes,
        $cas['fuseau'],
        CarbonImmutable::parse($cas['maintenant']),
    );

    expect($resultat->statut->value)->toBe($cas['attendu']['statut'])
        ->and($resultat->prochaineOuverture?->utc()->format('Y-m-d\TH:i:s\Z'))->toBe($cas['attendu']['prochaine_ouverture']);
})->with('cas-statut');

it('sans aucun horaire : horaires à confirmer (pas fermée), sans prochaine ouverture', function (): void {
    $resultat = (new StatutPharmacie)->calculer(false, [], [], 'Africa/Abidjan', CarbonImmutable::parse('2026-10-20T10:00:00Z'));

    expect($resultat->statut->value)->toBe('inconnue')
        ->and($resultat->prochaineOuverture)->toBeNull();
});

it('exclut la fin de garde et inclut son début', function (): void {
    $garde = [['debut' => CarbonImmutable::parse('2026-10-17T08:00:00Z'), 'fin' => CarbonImmutable::parse('2026-10-24T08:00:00Z')]];
    $regle = new StatutPharmacie;

    expect($regle->calculer(false, [], $garde, 'UTC', CarbonImmutable::parse('2026-10-17T08:00:00Z'))->statut->value)->toBe('garde')
        ->and($regle->calculer(false, [], $garde, 'UTC', CarbonImmutable::parse('2026-10-24T08:00:00Z'))->statut->value)->toBe('inconnue');
});

it('refuse une heure invalide', function (): void {
    StatutPharmacie::minutes('25:00');
})->throws(InvalidArgumentException::class);
