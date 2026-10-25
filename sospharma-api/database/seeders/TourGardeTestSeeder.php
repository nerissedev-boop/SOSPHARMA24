<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Comptes\Models\User;
use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Ville;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;

/** Un tour de garde publié couvrant la semaine en cours (samedi 08:00 → samedi 08:00, heure d'Abidjan). */
class TourGardeTestSeeder extends Seeder
{
    private const PHARMACIES_DE_GARDE = ['ph_test01', 'ph_test04', 'ph_test07', 'ph_test09', 'ph_test11', 'ph_test14'];

    public function run(): void
    {
        $abidjan = Ville::query()->where('id_public', 'vi_abj')->firstOrFail();
        $admin = User::query()->where('email', (string) config('sospharma.seed.admin_email'))->first();

        $local = CarbonImmutable::now('Africa/Abidjan');
        $debut = $local->dayOfWeek === CarbonInterface::SATURDAY && $local->hour >= 8
            ? $local->setTime(8, 0)
            : $local->previous(CarbonInterface::SATURDAY)->setTime(8, 0);
        $debut = $debut->utc();
        $fin = $debut->addWeek();

        $tour = TourGarde::query()->updateOrCreate(['id_public' => 'tg_test_semaine'], [
            'ville_id' => $abidjan->id,
            'debut' => $debut,
            'fin' => $fin,
            'statut' => StatutTour::Publie,
            'saisi_par' => $admin?->id,
            'valide_par' => $admin?->id,
            'valide_le' => $debut->subDay(),
            'actif' => true,
        ]);
        $tour->gardes()->delete();

        foreach (self::PHARMACIES_DE_GARDE as $i => $idPublic) {
            $pharmacie = Pharmacie::query()->where('id_public', $idPublic)->firstOrFail();
            Garde::query()->create([
                'tour_garde_id' => $tour->id,
                'pharmacie_id' => $pharmacie->id,
                'debut' => $debut,
                'fin' => $fin,
                'confirmee_le' => $i < 2 ? $debut->subHours(12) : null,
            ]);
        }
    }
}
