<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Gardes\Services\ImportListeGarde;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\ImportPharmaciesOsm;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

/*
| Abidjan (creerAbidjan : communes Cocody et Plateau) :
|  - Lagunes : trouvée par son nom à Cocody, sans numéro ni adresse ;
|  - St Jean : à vérifier (« Saint Jean Bosco » en base) ;
|  - Commerce : inconnue, à créer au Plateau ;
|  - Yamoussoukro : ville absente de la base.
*/

const LISTE_ABIDJAN = <<<'TXT'
TOUR DE GARDE DU MOIS D'OCTOBRE 2026
SEMAINE DU SAMEDI 24 AU VENDREDI 30 OCTOBRE 2026
COCODY PHCIE DES LAGUNES / M. KOUASSI - TEL. 27 22 44 55 66 / RUE DES JARDINS
PHCIE ST JEAN / MME BAMBA - TEL. 07 07 07 07 07 / CARREFOUR DE LA VIE
PLATEAU PHCIE DU COMMERCE (NVLLE) / M. KONE - TEL. 27 20 21 22 23 / AVENUE CHARDY
YAMOUSSOUKRO PHCIE DU LAC / M. DIABATE - TEL. 27 30 64 00 00
TXT;

beforeEach(function (): void {
    $this->ville = creerAbidjan();
    $cocody = Zone::query()->where('nom', 'Cocody')->firstOrFail();
    $this->lagunes = creerPharmacie($this->ville, ['nom' => 'Pharmacie des Lagunes', 'zone_id' => $cocody->id, 'adresse' => ImportPharmaciesOsm::ADRESSE_INCONNUE]);
    $this->saintJean = creerPharmacie($this->ville, ['nom' => 'Pharmacie Saint Jean Bosco', 'zone_id' => $cocody->id, 'telephone' => '+2250102030405']);
    Sanctum::actingAs(creerCompte(Role::Admin));
});

function importerListe(array $donnees = []): TestResponse
{
    return test()->postJson('/api/v1/admin/listes-garde/import', ['texte' => LISTE_ABIDJAN] + $donnees);
}

it('analyse la liste pour l\'écran de relecture', function (): void {
    $this->postJson('/api/v1/admin/listes-garde/analyse', ['texte' => LISTE_ABIDJAN])
        ->assertOk()
        ->assertJsonPath('data.premier_jour', '2026-10-24')
        ->assertJsonPath('data.dernier_jour', '2026-10-30')
        ->assertJsonPath('data.pharmacies.0.rang', 0)
        ->assertJsonPath('data.pharmacies.0.statut', 'trouvee')
        ->assertJsonPath('data.pharmacies.0.action_proposee', 'rattacher')
        ->assertJsonPath('data.pharmacies.0.pharmacie.id', $this->lagunes->id_public)
        ->assertJsonPath('data.pharmacies.1.statut', 'a_verifier')
        ->assertJsonPath('data.pharmacies.1.action_proposee', 'ignorer')
        ->assertJsonPath('data.pharmacies.2.statut', 'inconnue')
        ->assertJsonPath('data.pharmacies.2.action_proposee', 'creer')
        ->assertJsonPath('data.pharmacies.3.alertes', ['ville_inconnue'])
        ->assertJsonPath('data.pharmacies.3.action_proposee', 'ignorer');
});

it('crée le brouillon de la semaine, la fiche inconnue et complète la fiche trouvée', function (): void {
    importerListe()
        ->assertCreated()
        ->assertJsonPath('data.tours.0.ville', 'Abidjan')
        ->assertJsonPath('data.tours.0.etat', 'cree')
        ->assertJsonPath('data.tours.0.gardes', 2)
        ->assertJsonPath('data.fiches_creees', 1)
        ->assertJsonPath('data.telephones_completes', 1)
        ->assertJsonPath('data.adresses_completees', 1)
        ->assertJsonPath('data.ignorees.0.raison', 'à vérifier, non confirmée')
        ->assertJsonPath('data.ignorees.1.raison', 'ville absente de la base');

    $tour = TourGarde::query()->with('gardes.pharmacie')->sole();
    expect($tour->statut)->toBe(StatutTour::Brouillon)
        ->and($tour->debut->toIso8601ZuluString())->toBe('2026-10-24T08:00:00Z')
        ->and($tour->fin->toIso8601ZuluString())->toBe('2026-10-31T08:00:00Z')
        ->and($tour->gardes->pluck('pharmacie.nom')->sort()->values()->all())->toBe(['Pharmacie des Lagunes', 'Pharmacie du Commerce']);

    $commerce = Pharmacie::query()->where('nom', 'Pharmacie du Commerce')->sole();
    expect($commerce->aUnePosition())->toBeFalse()
        ->and($commerce->zone->nom)->toBe('Plateau')
        ->and($commerce->telephone)->toBe('+2252720212223')
        ->and($commerce->adresse)->toBe('AVENUE CHARDY')
        ->and($commerce->verifiee_le)->toBeNull();

    expect($this->lagunes->fresh()->telephone)->toBe('+2252722445566')
        ->and($this->lagunes->fresh()->adresse)->toBe('RUE DES JARDINS')
        // Fiche à vérifier non confirmée : rien n'y est touché.
        ->and($this->saintJean->fresh()->telephone)->toBe('+2250102030405');
});

it('rattache une fiche à vérifier quand on la confirme, sans écraser son numéro', function (): void {
    importerListe(['decisions' => [['rang' => 1, 'action' => 'rattacher']]])
        ->assertCreated()
        ->assertJsonPath('data.tours.0.gardes', 3)
        ->assertJsonPath('data.telephones_completes', 1);

    expect(Garde::query()->where('pharmacie_id', $this->saintJean->id)->exists())->toBeTrue()
        ->and($this->saintJean->fresh()->telephone)->toBe('+2250102030405');
});

it('rattache à la fiche choisie à la main, ou refuse une fiche inexistante', function (): void {
    importerListe(['decisions' => [['rang' => 2, 'action' => 'rattacher', 'pharmacie' => $this->saintJean->id_public]]])
        ->assertCreated()
        ->assertJsonPath('data.fiches_creees', 0);

    TourGarde::query()->delete();
    importerListe(['decisions' => [['rang' => 2, 'action' => 'rattacher', 'pharmacie' => 'ph_inexistante']]])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'VALIDATION_FAILED');
});

it('n\'écrit rien en simulation', function (): void {
    importerListe(['simulation' => true])
        ->assertOk()
        ->assertJsonPath('data.fiches_creees', 1)
        ->assertJsonPath('data.tours.0.gardes', 2);

    expect(TourGarde::query()->count())->toBe(0)
        ->and(Pharmacie::query()->count())->toBe(2)
        ->and($this->lagunes->fresh()->telephone)->toBeNull();
});

it('remplace son brouillon quand on relance, et ne touche pas un tour publié', function (): void {
    importerListe()->assertCreated();
    importerListe()->assertCreated()->assertJsonPath('data.tours.0.etat', 'remplace');

    expect(TourGarde::query()->count())->toBe(1)
        ->and(Garde::query()->count())->toBe(2)
        // La fiche créée au premier passage est retrouvée par son téléphone, pas recréée.
        ->and(Pharmacie::query()->where('nom', 'Pharmacie du Commerce')->count())->toBe(1);

    TourGarde::query()->update(['statut' => StatutTour::Publie->value]);
    importerListe()->assertCreated()->assertJsonPath('data.tours.0.etat', 'deja_publie');
    expect(Garde::query()->count())->toBe(2);
});

it('demande la période si l\'en-tête n\'en donne pas', function (): void {
    $texte = 'COCODY PHCIE DES LAGUNES / M. KOUASSI - TEL. 27 22 44 55 66';

    $this->postJson('/api/v1/admin/listes-garde/import', ['texte' => $texte])->assertStatus(422);
    $this->postJson('/api/v1/admin/listes-garde/import', ['texte' => $texte, 'premier_jour' => '2026-10-31', 'dernier_jour' => '2026-11-06'])
        ->assertCreated()
        ->assertJsonPath('data.premier_jour', '2026-10-31');
});

it('réserve la liste officielle aux admins', function (): void {
    Sanctum::actingAs(creerCompte(Role::EditeurVille, $this->ville));

    $this->postJson('/api/v1/admin/listes-garde/analyse', ['texte' => LISTE_ABIDJAN])->assertForbidden();
});

it('importe en ligne de commande', function (): void {
    $fichier = tempnam(sys_get_temp_dir(), 'liste');
    file_put_contents($fichier, LISTE_ABIDJAN);

    $this->artisan('gardes:importer-liste', ['fichier' => $fichier, '--simulation' => true, '--no-interaction' => true])
        ->expectsOutputToContain('Semaine du 2026-10-24 au 2026-10-30 (simulation : rien n\'est écrit).')
        ->assertSuccessful();
    expect(TourGarde::query()->count())->toBe(0);

    $this->artisan('gardes:importer-liste', ['fichier' => $fichier, '--accepter-a-verifier' => true, '--no-interaction' => true])->assertSuccessful();
    expect(Garde::query()->count())->toBe(3);
    unlink($fichier);
});

it('met en forme le nom des fiches créées', function (): void {
    expect(ImportListeGarde::nomFiche("DE L'INDENIE"))->toBe("Pharmacie de l'Indenie")
        ->and(ImportListeGarde::nomFiche('ST PIERRE NIMBO'))->toBe('Pharmacie St Pierre Nimbo')
        ->and(ImportListeGarde::nomFiche('MARCHE DE GROS DE BOUAKE'))->toBe('Pharmacie Marche de Gros de Bouake');
});
