<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Comptes\Models\User;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Enums\StatutPays;
use App\Modules\Territoire\Enums\StatutVille;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Models\Pays;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

pest()->extend(TestCase::class)->use(RefreshDatabase::class)->in('Feature');
pest()->extend(TestCase::class)->in('Unit');

/*
| Aides de test : un petit territoire (Côte d'Ivoire, Abidjan, deux communes rectangulaires),
| des pharmacies et des comptes. Données fictives.
*/

function creerPays(string $code = 'CI', string $fuseau = 'Africa/Abidjan', StatutPays $statut = StatutPays::Ouvert): Pays
{
    return Pays::query()->create([
        'code' => $code,
        'nom' => $code === 'CI' ? 'Côte d\'Ivoire' : 'Pays '.$code,
        'indicatif' => '+225',
        'fuseau' => $fuseau,
        'devise' => 'XOF',
        'urgences' => [['service' => 'samu', 'libelle' => 'SAMU', 'numero' => '185']],
        'statut' => $statut,
    ]);
}

function creerVille(?Pays $pays = null, string $nom = 'Abidjan', StatutVille $statut = StatutVille::Ouverte, ?string $idPublic = null): Ville
{
    $pays ??= creerPays();

    return Ville::query()->create([
        'id_public' => $idPublic ?? Ville::genererIdPublic(),
        'pays_id' => $pays->id,
        'nom' => $nom,
        'statut' => $statut,
        'latitude' => 5.345,
        'longitude' => -4.024,
    ]);
}

/** Commune rectangulaire [minLat, maxLat, minLng, maxLng]. */
function creerZone(Ville $ville, string $nom, array $rectangle, TypeZone $type = TypeZone::Commune): Zone
{
    [$minLat, $maxLat, $minLng, $maxLng] = $rectangle;

    return Zone::query()->create([
        'ville_id' => $ville->id,
        'nom' => $nom,
        'type' => $type,
        'contour' => ['type' => 'Polygon', 'coordinates' => [[
            [$minLng, $minLat], [$maxLng, $minLat], [$maxLng, $maxLat], [$minLng, $maxLat], [$minLng, $minLat],
        ]]],
    ]);
}

/** Abidjan avec Cocody et Plateau (contours fictifs). */
function creerAbidjan(): Ville
{
    $ville = creerVille(idPublic: 'vi_abj');
    creerZone($ville, 'Cocody', [5.330, 5.380, -4.010, -3.930]);
    creerZone($ville, 'Plateau', [5.310, 5.340, -4.035, -4.010]);

    return $ville;
}

function creerPharmacie(Ville $ville, array $attributs = [], array $horaires = []): Pharmacie
{
    $pharmacie = Pharmacie::query()->create($attributs + [
        'ville_id' => $ville->id,
        'nom' => 'Pharmacie de test '.random_int(1000, 9999),
        'adresse' => 'Adresse de test',
        'latitude' => 5.355,
        'longitude' => -3.970,
        'h24' => false,
        'actif' => true,
    ]);
    foreach ($horaires as $plage) {
        $pharmacie->horaires()->create($plage);
    }

    return $pharmacie;
}

function creerCompte(Role $role, ?Ville $ville = null, array $attributs = []): User
{
    return User::query()->create($attributs + [
        'nom' => 'Compte '.$role->value,
        'email' => $role->value.random_int(1000, 99999).'@sospharma.test',
        'password' => 'Mot-de-passe-test-1',
        'role' => $role,
        'ville_id' => $ville?->id,
        'actif' => true,
    ]);
}

/** Agent terrain rattaché aux villes données. */
function creerAgent(Ville ...$villes): User
{
    $agent = creerCompte(Role::AgentTerrain);
    $agent->synchroniserVilles(array_map(fn (Ville $v): int => $v->id, $villes));

    return $agent;
}

/** Assurance du référentiel du pays (slug déduit du nom s'il est absent). */
function creerAssurance(Pays $pays, string $nom, TypeAssurance $type = TypeAssurance::Privee, ?string $slug = null, bool $actif = true): Assurance
{
    return Assurance::query()->create([
        'pays_id' => $pays->id,
        'nom' => $nom,
        'slug' => $slug ?? Str::slug($nom),
        'type' => $type,
        'actif' => $actif,
    ]);
}

/** Relie des assurances à une pharmacie (tiers payant faux par défaut). */
function lierAssurances(Pharmacie $pharmacie, Assurance ...$assurances): void
{
    $pharmacie->assurances()->syncWithoutDetaching(array_fill_keys(array_map(fn (Assurance $a): int => $a->id, $assurances), ['tiers_payant' => false]));
}

/** Vérifie l'enveloppe commune à toutes les réponses. */
function verifierMeta(array $json): void
{
    expect($json)->toHaveKey('success')
        ->and($json['meta']['request_id'])->toStartWith('req_')
        ->and($json['meta']['generated_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/');
}
