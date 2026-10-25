<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Territoire\Enums\StatutVille;
use Laravel\Sanctum\Sanctum;

it('relit la configuration des pays depuis un cache qui sérialise vraiment', function (): void {
    // Comme en production (cache « database ») : Laravel 13 refuse de désérialiser des objets,
    // un modèle mis en cache revenait incomplet et le deuxième appel échouait en 500.
    config(['cache.stores.array.serialize' => true]);
    app('cache')->forgetDriver('array');
    creerAbidjan();

    $this->getJson('/api/v1/pays')->assertOk()->assertJsonPath('data.0.code', 'CI');
    $this->getJson('/api/v1/pays')->assertOk()->assertJsonPath('data.0.code', 'CI')->assertJsonPath('data.0.fuseau', 'Africa/Abidjan');
});

it('donne le résumé du pays, ses coordonnées de support et le nombre de communes de chaque ville', function (): void {
    $abidjan = creerAbidjan();
    creerVille($abidjan->pays, 'Bouaké', StatutVille::Bientot, 'vi_bke');
    $abidjan->pays->update(['support_whatsapp' => '+2250102030405', 'support_email' => 'aide@sospharma.test']);

    $this->getJson('/api/v1/pays')
        ->assertOk()
        ->assertJsonPath('data.0.resume', 'Abidjan ouvert, autres villes bientôt')
        ->assertJsonPath('data.0.support', ['whatsapp' => '+2250102030405', 'telephone' => null, 'email' => 'aide@sospharma.test']);

    $villes = collect($this->getJson('/api/v1/pays/CI/villes')->assertOk()->json('data'));
    expect($villes->firstWhere('nom', 'Abidjan')['nombre_communes'])->toBe(2)
        ->and($villes->firstWhere('nom', 'Bouaké')['nombre_communes'])->toBe(0);
});

it('refuse un numéro de support qui n’est pas au format international', function (): void {
    creerAbidjan();
    Sanctum::actingAs(creerCompte(Role::Admin));

    $this->patchJson('/api/v1/admin/pays/CI', ['support_telephone' => '0102030405'])
        ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    $this->patchJson('/api/v1/admin/pays/CI', ['support_telephone' => '+2250102030405'])
        ->assertOk()->assertJsonPath('data.support.telephone', '+2250102030405');
});

it('détecte la commune depuis une position', function (): void {
    creerAbidjan();

    $this->getJson('/api/v1/zones/depuis-position?lat=5.355&lng=-3.97')
        ->assertOk()
        ->assertJsonPath('data.commune.nom', 'Cocody')
        ->assertJsonPath('data.ville.id', 'vi_abj')
        ->assertJsonPath('data.libelle', 'Cocody, Abidjan')
        ->assertJsonPath('data.quartier', null);
});

it('signale une ville pas encore ouverte', function (): void {
    $ville = creerVille(nom: 'Bouaké', statut: StatutVille::Bientot);
    creerZone($ville, 'Centre', [7.60, 7.75, -5.10, -4.95]);

    $this->getJson('/api/v1/zones/depuis-position?lat=7.69&lng=-5.03')
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'ZONE_NOT_COVERED')
        ->assertJsonPath('error.details.ville.0', $ville->id_public);
});

it('liste les communes avec leurs compteurs et accepte q', function (): void {
    $ville = creerAbidjan();
    creerPharmacie($ville, ['zone_id' => $ville->zones()->where('nom', 'Cocody')->value('id')]);

    $json = $this->getJson('/api/v1/villes/vi_abj/zones')->assertOk()->json();
    expect($json['data'])->toHaveCount(2)
        ->and(collect($json['data'])->firstWhere('nom', 'Cocody')['compteurs']['pharmacies'])->toBe(1);

    $this->getJson('/api/v1/villes/vi_abj/zones?q=plat')->assertOk()->assertJsonCount(1, 'data');
});
