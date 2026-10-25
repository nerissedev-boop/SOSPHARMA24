<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Territoire\Enums\StatutPays;
use App\Modules\Territoire\Enums\StatutVille;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Models\Pays;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Database\Seeder;

class TerritoireSeeder extends Seeder
{
    /**
     * Les 13 communes du District d'Abidjan avec un rectangle FICTIF et simplifié
     * [minLat, maxLat, minLng, maxLng] : approximation grossière pour les tests, à remplacer par les vrais contours.
     */
    public const COMMUNES = [
        'abobo' => ['Abobo', 5.380, 5.460, -4.055, -3.980],
        'adjame' => ['Adjamé', 5.340, 5.380, -4.035, -4.010],
        'anyama' => ['Anyama', 5.460, 5.550, -4.100, -4.000],
        'attecoube' => ['Attécoubé', 5.315, 5.360, -4.055, -4.035],
        'bingerville' => ['Bingerville', 5.330, 5.400, -3.930, -3.850],
        'cocody' => ['Cocody', 5.330, 5.380, -4.010, -3.930],
        'koumassi' => ['Koumassi', 5.280, 5.310, -3.970, -3.935],
        'marcory' => ['Marcory', 5.285, 5.310, -3.995, -3.970],
        'plateau' => ['Plateau', 5.310, 5.340, -4.035, -4.010],
        'port-bouet' => ['Port-Bouët', 5.220, 5.280, -4.000, -3.900],
        'songon' => ['Songon', 5.280, 5.380, -4.320, -4.100],
        'treichville' => ['Treichville', 5.285, 5.310, -4.025, -3.995],
        'yopougon' => ['Yopougon', 5.300, 5.400, -4.100, -4.055],
    ];

    public function run(): void
    {
        $pays = Pays::query()->updateOrCreate(['code' => 'CI'], [
            'nom' => 'Côte d\'Ivoire',
            'indicatif' => '+225',
            'fuseau' => 'Africa/Abidjan',
            'devise' => 'XOF',
            'urgences' => [
                ['service' => 'samu', 'libelle' => 'SAMU', 'numero' => '185'],
                ['service' => 'pompiers', 'libelle' => 'Pompiers', 'numero' => '180'],
                ['service' => 'police', 'libelle' => 'Police', 'numero' => '170'],
            ],
            'langues' => ['fr'],
            'statut' => StatutPays::Ouvert,
            'actif' => true,
        ]);

        $abidjan = Ville::query()->updateOrCreate(['pays_id' => $pays->id, 'nom' => 'Abidjan'], [
            'id_public' => 'vi_abj',
            'statut' => StatutVille::Ouverte,
            'latitude' => 5.345317,
            'longitude' => -4.024429,
            'actif' => true,
        ]);

        foreach (self::COMMUNES as $cle => [$nom, $minLat, $maxLat, $minLng, $maxLng]) {
            Zone::query()->updateOrCreate(['ville_id' => $abidjan->id, 'type' => TypeZone::Commune->value, 'nom' => $nom], [
                'id_public' => 'zo_'.str_replace('-', '', $cle),
                'contour' => self::rectangle($minLat, $maxLat, $minLng, $maxLng),
                'contour_source' => 'FICTIF – rectangle simplifié pour les tests',
                'actif' => true,
            ]);
        }
    }

    /** @return array{type: 'Polygon', coordinates: list<list<list<float>>>} */
    public static function rectangle(float $minLat, float $maxLat, float $minLng, float $maxLng): array
    {
        return [
            'type' => 'Polygon',
            'coordinates' => [[
                [$minLng, $minLat], [$maxLng, $minLat], [$maxLng, $maxLat], [$minLng, $maxLat], [$minLng, $minLat],
            ]],
        ];
    }
}
