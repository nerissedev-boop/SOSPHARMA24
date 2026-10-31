<?php

declare(strict_types=1);

use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Models\TourGarde;

beforeEach(function (): void {
    // Mardi 20 octobre 2026, 10:00 à Abidjan (UTC+0).
    $this->travelTo(now()->parse('2026-10-20T10:00:00Z'));
    $this->ville = creerAbidjan();
    $mardi = [['jour' => 2, 'ouverture' => '08:00', 'fermeture' => '20:00']];

    $this->proche = creerPharmacie($this->ville, ['nom' => 'Proche', 'latitude' => 5.3560, 'longitude' => -3.9700], $mardi);
    $this->moyenne = creerPharmacie($this->ville, ['nom' => 'Moyenne', 'latitude' => 5.3650, 'longitude' => -3.9700]);
    lierAssurances($this->moyenne, creerAssurance($this->ville->pays, '[Assureur privé A]', slug: 'assureur-prive-a'));
    $this->lointaine = creerPharmacie($this->ville, ['nom' => 'Lointaine', 'latitude' => 5.4500, 'longitude' => -3.9700, 'h24' => true]);
    $this->inactive = creerPharmacie($this->ville, ['nom' => 'Inactive', 'latitude' => 5.3555, 'longitude' => -3.9700, 'actif' => false]);
});

it('trie par distance dans le rayon, avec statut, distance et temps de marche', function (): void {
    $json = $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&rayon=2000')->assertOk()->json();

    verifierMeta($json);
    expect(array_column($json['data'], 'nom'))->toBe(['Proche', 'Moyenne'])
        ->and($json['meta'])->toMatchArray(['rayon' => 2000, 'limite' => 20, 'nombre' => 2])
        ->and($json['data'][0]['statut'])->toBe('ouverte')
        ->and($json['data'][0]['distance_m'])->toBeGreaterThan(100)->toBeLessThan(130)
        ->and($json['data'][0]['marche_min'])->toBe(2)
        ->and($json['data'][0]['id'])->toStartWith('ph_')
        // Aucun horaire connu : « horaires à confirmer », pas « fermée ».
        ->and($json['data'][1]['statut'])->toBe('inconnue')
        ->and($json['data'][1]['prochaine_ouverture'])->toBeNull()
        // null jamais omis
        ->and($json['data'][1])->toHaveKeys(['whatsapp', 'quartier', 'garde', 'verifiee_le']);
});

it('respecte la limite', function (): void {
    $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&limite=1')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.limite', 1);
});

it('filtre par assurance, 24h/24 et statut', function (): void {
    $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[assurances]=assureur-prive-a')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nom', 'Moyenne');

    $this->getJson('/api/v1/pharmacies/proches?lat=5.43&lng=-3.97&rayon=5000&filter[h24]=true')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nom', 'Lointaine');

    $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[statut]=inconnue')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nom', 'Moyenne');
});

it('fait passer une pharmacie de garde en statut garde', function (): void {
    $tour = TourGarde::query()->create([
        'ville_id' => $this->ville->id, 'debut' => now()->subDay(), 'fin' => now()->addDays(6), 'statut' => StatutTour::Publie,
    ]);
    $tour->gardes()->create(['pharmacie_id' => $this->moyenne->id, 'debut' => $tour->debut, 'fin' => $tour->fin]);

    $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[statut]=garde')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.nom', 'Moyenne')
        ->assertJsonPath('data.0.garde.confirmee_le', null)
        // Garde d'une semaine : elle couvre toute la nuit.
        ->assertJsonPath('data.0.garde.jusqua', null);
});

it('donne l’heure locale de fin d’une garde qui s’arrête avant le matin (garde.jusqua)', function (): void {
    // Mardi 10:00 à Abidjan ; garde de 09:00 à 02:00 la nuit suivante.
    $tour = TourGarde::query()->create([
        'ville_id' => $this->ville->id, 'debut' => now()->subHour(), 'fin' => now()->addHours(16), 'statut' => StatutTour::Publie,
    ]);
    $tour->gardes()->create(['pharmacie_id' => $this->moyenne->id, 'debut' => $tour->debut, 'fin' => $tour->fin]);

    $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&filter[statut]=garde')
        ->assertOk()
        ->assertJsonPath('data.0.garde.jusqua', '02:00');
});

it('donne ville, horaires, heure de fermeture et gardes, pour le recalcul hors connexion de l’app', function (): void {
    $tour = TourGarde::query()->create([
        'ville_id' => $this->ville->id, 'debut' => now()->subDay(), 'fin' => now()->addDays(6), 'statut' => StatutTour::Publie,
    ]);
    $tour->gardes()->create(['pharmacie_id' => $this->moyenne->id, 'debut' => $tour->debut, 'fin' => $tour->fin]);

    $json = $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&rayon=2000')->assertOk()->json('data');
    $proche = collect($json)->firstWhere('nom', 'Proche');
    $moyenne = collect($json)->firstWhere('nom', 'Moyenne');

    // Mardi 10:00, ouverte de 08:00 à 20:00.
    expect($proche['ville'])->toBe(['id' => $this->ville->id_public, 'nom' => $this->ville->nom])
        ->and($proche['ferme_a'])->toBe('20:00')
        ->and($proche['horaires'])->toBe([['jour' => 2, 'ouverture' => '08:00', 'fermeture' => '20:00']])
        ->and($proche['gardes'])->toBe([])
        ->and($moyenne['statut'])->toBe('garde')
        ->and($moyenne['ferme_a'])->toBeNull()
        ->and($moyenne['gardes'])->toHaveCount(1)
        ->and($moyenne['gardes'][0]['fin'])->toBe($tour->fin->utc()->format('Y-m-d\TH:i:s\Z'));
});

it('donne le slug de chaque assurance, valeur des filtres de l’app', function (): void {
    $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&rayon=2000')
        ->assertOk()
        ->assertJsonPath('data.1.nom', 'Moyenne')
        ->assertJsonPath('data.1.assurances.0.slug', 'assureur-prive-a');
});

it('refuse un rayon supérieur à 5 000 m', function (): void {
    $this->getJson('/api/v1/pharmacies/proches?lat=5.355&lng=-3.97&rayon=9000')
        ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
});

it('renvoie les points du cadre de carte avec nombre et tronque', function (): void {
    $this->getJson('/api/v1/pharmacies/cadre?bbox=-3.98,5.35,-3.96,5.37')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.nombre', 2)
        ->assertJsonPath('meta.tronque', false);
});

it('affiche la fiche complète et ignore les pharmacies désactivées', function (): void {
    $this->getJson('/api/v1/pharmacies/'.$this->proche->id_public)
        ->assertOk()
        ->assertJsonPath('data.horaires.0.ouverture', '08:00')
        ->assertJsonPath('data.indicatif', '+225');

    $this->getJson('/api/v1/pharmacies/'.$this->inactive->id_public)
        ->assertNotFound()->assertJsonPath('error.code', 'NOT_FOUND');
});

it('cherche par nom', function (): void {
    $this->getJson('/api/v1/pharmacies/recherche?q=moy&ville=vi_abj')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nom', 'Moyenne');
});
