<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->ville = creerAbidjan();
    $this->a = creerPharmacie($this->ville, ['id_public' => 'ph_import01']);
    $this->b = creerPharmacie($this->ville, ['id_public' => 'ph_import02']);
    $this->inactive = creerPharmacie($this->ville, ['id_public' => 'ph_import03', 'actif' => false]);
    Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->ville));
});

function csv(string $contenu): UploadedFile
{
    return UploadedFile::fake()->createWithContent('tour.csv', $contenu);
}

it('crée un brouillon depuis un CSV valide', function (): void {
    $fichier = csv("pharmacie;debut;fin\nph_import01;;\nph_import02;2026-10-24 20:00;2026-10-25 02:00\n");

    $this->post('/api/v1/admin/tours-garde/import', [
        'ville' => 'vi_abj', 'debut' => '2026-10-24T08:00:00Z', 'fin' => '2026-10-31T08:00:00Z', 'fichier' => $fichier,
    ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('data.statut', 'brouillon')
        ->assertJsonPath('data.nombre_gardes', 2)
        ->assertJsonPath('data.gardes.1.fin', '2026-10-25T02:00:00Z');
});

it('renvoie les erreurs ligne par ligne et annule tout l\'import', function (): void {
    $fichier = csv("pharmacie;debut;fin\nph_import01;;\nph_inconnue;;\nph_import03;;\nph_import02;2026-13-40 25:00;\n");

    $json = $this->post('/api/v1/admin/tours-garde/import', [
        'ville' => 'vi_abj', 'debut' => '2026-10-24T08:00:00Z', 'fin' => '2026-10-31T08:00:00Z', 'fichier' => $fichier,
    ], ['Accept' => 'application/json'])->assertStatus(422)->json();

    verifierMeta($json);
    expect($json['error']['code'])->toBe('VALIDATION_FAILED')
        ->and(array_keys($json['error']['details']))->toBe(['ligne_3', 'ligne_4', 'ligne_5'])
        ->and($json['error']['details']['ligne_3'][0])->toContain('ph_inconnue')
        ->and(TourGarde::query()->count())->toBe(0)
        ->and(Garde::query()->count())->toBe(0);
});

it('refuse un CSV sans la colonne pharmacie', function (): void {
    $this->post('/api/v1/admin/tours-garde/import', [
        'ville' => 'vi_abj', 'debut' => '2026-10-24T08:00:00Z', 'fin' => '2026-10-31T08:00:00Z', 'fichier' => csv("nom;debut\nX;\n"),
    ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonPath('error.details.fichier.0', 'Colonnes attendues : pharmacie.');
});
