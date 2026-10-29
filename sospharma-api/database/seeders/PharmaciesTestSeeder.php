<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Database\Seeder;

/**
 * 20 pharmacies FICTIVES (noms, adresses et numéros inventés, numéros non attribués +22500000001xx).
 * Toutes portent la mention « (test) », courte pour tenir dans les listes de l'app.
 * Leurs assurances viennent de AssurancesTestSeeder.
 */
class PharmaciesTestSeeder extends Seeder
{
    /** [commune, nom, décalage lat, décalage lng, profil horaire] */
    private const PHARMACIES = [
        ['cocody', 'Alpha', 0.004, 0.006, 'standard'],
        ['cocody', 'Baobab', -0.006, -0.010, 'dimanche'],
        ['cocody', 'Corail', 0.010, 0.020, 'h24'],
        ['yopougon', 'Delta', 0.010, 0.005, 'standard'],
        ['yopougon', 'Ebène', -0.015, -0.010, 'nuit'],
        ['yopougon', 'Fromager', 0.030, 0.010, 'standard'],
        ['abobo', 'Gazelle', 0.010, 0.010, 'standard'],
        ['abobo', 'Hibiscus', -0.020, -0.015, 'dimanche'],
        ['plateau', 'Iroko', 0.003, 0.004, 'standard'],
        ['plateau', 'Jacaranda', -0.004, -0.006, 'h24'],
        ['marcory', 'Karité', 0.003, 0.005, 'standard'],
        ['marcory', 'Lagune', -0.004, -0.004, 'dimanche'],
        ['treichville', 'Manguier', 0.002, 0.004, 'nuit'],
        ['koumassi', 'Néré', 0.003, -0.004, 'standard'],
        ['adjame', 'Okoumé', 0.004, 0.003, 'standard'],
        ['port-bouet', 'Palmier', 0.010, -0.020, 'dimanche'],
        ['attecoube', 'Quinquina', 0.005, 0.002, 'standard'],
        ['bingerville', 'Rônier', -0.005, 0.010, 'standard'],
        ['anyama', 'Savane', 0.010, 0.010, 'standard'],
        ['songon', 'Tamarinier', 0.010, 0.030, 'standard'],
    ];

    private const SERVICES = ['Conseil', 'Prise de tension', 'Test de glycémie', 'Parapharmacie'];

    public function run(): void
    {
        $abidjan = Ville::query()->where('id_public', 'vi_abj')->firstOrFail();
        $zones = Zone::query()->where('ville_id', $abidjan->id)->get()->keyBy('id_public');

        foreach (self::PHARMACIES as $i => [$commune, $nom, $dLat, $dLng, $profil]) {
            $numero = $i + 1;
            [$nomCommune, $minLat, $maxLat, $minLng, $maxLng] = TerritoireSeeder::COMMUNES[$commune];
            $zone = $zones['zo_'.str_replace('-', '', $commune)];

            $pharmacie = Pharmacie::query()->updateOrCreate(['id_public' => sprintf('ph_test%02d', $numero)], [
                'ville_id' => $abidjan->id,
                'zone_id' => $zone->id,
                'nom' => "Pharmacie {$nom} (test)",
                'adresse' => "{$numero} rue fictive, {$nomCommune} – adresse de test",
                'quartier' => "Quartier test {$numero}",
                'telephone' => sprintf('+22500000001%02d', $numero),
                'whatsapp' => $numero % 3 === 0 ? null : sprintf('+22500000001%02d', $numero),
                'latitude' => round(($minLat + $maxLat) / 2 + $dLat, 6),
                'longitude' => round(($minLng + $maxLng) / 2 + $dLng, 6),
                'h24' => $profil === 'h24',
                'services' => array_slice(self::SERVICES, 0, 1 + $numero % 4),
                'verifiee_le' => now()->subDays($numero),
                'actif' => true,
            ]);

            $pharmacie->horaires()->delete();
            foreach (self::horaires($profil) as $plage) {
                $pharmacie->horaires()->create($plage);
            }
        }
    }

    /** @return list<array{jour: int, ouverture: string, fermeture: string}> */
    private static function horaires(string $profil): array
    {
        if ($profil === 'h24') {
            return [];
        }
        $plages = [];
        foreach (range(1, 6) as $jour) { // lundi … samedi
            $plages[] = $profil === 'nuit'
                ? ['jour' => $jour, 'ouverture' => '18:00', 'fermeture' => '02:00'] // passe minuit
                : ['jour' => $jour, 'ouverture' => '08:00', 'fermeture' => $jour === 6 ? '13:00' : '21:00'];
        }
        if ($profil === 'dimanche') {
            $plages[] = ['jour' => 0, 'ouverture' => '09:00', 'fermeture' => '13:00'];
        }

        return $plages;
    }
}
