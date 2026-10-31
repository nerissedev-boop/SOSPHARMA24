<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Modules\Pharmacies\Contrats\PeriodeGarde;
use App\Modules\Pharmacies\Enums\StatutOuverture;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use InvalidArgumentException;

/**
 * La règle de statut, calculée à un seul endroit. Priorité : garde > ouverte > fermée.
 *
 * 1. De garde : une garde publiée couvre l'instant (début inclus, fin exclue).
 * 2. Ouverte : 24h/24, ou l'heure locale (fuseau du pays) tombe dans une plage du jour.
 *    Une plage dont la fermeture est avant (ou égale à) l'ouverture passe minuit.
 * 3. Fermée : sinon, avec la prochaine ouverture (UTC) dans les 7 jours, ou null.
 *
 * Fonction pure : vérifiée par tests/Fixtures/cas-statut.json, partagé avec l'app mobile.
 */
final class StatutPharmacie
{
    /**
     * @param  iterable<array{jour: int, ouverture: string, fermeture: string}>  $horaires
     * @param  iterable<PeriodeGarde|array{debut: CarbonInterface, fin: CarbonInterface}>  $gardes
     */
    public function calculer(bool $h24, iterable $horaires, iterable $gardes, string $fuseau, CarbonInterface $maintenant): ResultatStatut
    {
        $instant = CarbonImmutable::instance($maintenant)->utc();

        foreach ($gardes as $garde) {
            $periode = $garde instanceof PeriodeGarde
                ? $garde
                : new PeriodeGarde(0, CarbonImmutable::instance($garde['debut'])->utc(), CarbonImmutable::instance($garde['fin'])->utc());
            if ($periode->couvre($instant)) {
                return new ResultatStatut(StatutOuverture::Garde, null, $periode, self::finAvantLeMatin($periode->fin, $instant, $fuseau));
            }
        }

        if ($h24) {
            return new ResultatStatut(StatutOuverture::Ouverte);
        }

        $plages = [];
        foreach ($horaires as $horaire) {
            $plages[] = [
                'jour' => (int) $horaire['jour'],
                'ouverture' => self::minutes($horaire['ouverture']),
                'fermeture' => self::minutes($horaire['fermeture']),
            ];
        }

        // Aucune plage connue : on ne sait pas, ce qui n'est pas « fermée » (fiches importées d'OpenStreetMap).
        if ($plages === []) {
            return new ResultatStatut(StatutOuverture::Inconnue);
        }

        $local = $instant->setTimezone($fuseau);
        $jour = $local->dayOfWeek;
        $minute = $local->hour * 60 + $local->minute;

        foreach ($plages as $plage) {
            if (self::ouverteDans($plage, $jour, $minute)) {
                return new ResultatStatut(StatutOuverture::Ouverte, fermeA: self::heure($plage['fermeture']));
            }
        }

        return new ResultatStatut(StatutOuverture::Fermee, $this->prochaineOuverture($plages, $local));
    }

    /** @param array{jour: int, ouverture: int, fermeture: int} $plage */
    private static function ouverteDans(array $plage, int $jour, int $minute): bool
    {
        if ($plage['fermeture'] > $plage['ouverture']) {
            return $plage['jour'] === $jour && $minute >= $plage['ouverture'] && $minute < $plage['fermeture'];
        }

        // Plage qui passe minuit : le soir du jour J, puis le matin de J+1 jusqu'à la fermeture.
        return ($plage['jour'] === $jour && $minute >= $plage['ouverture'])
            || ((($plage['jour'] + 1) % 7) === $jour && $minute < $plage['fermeture']);
    }

    /** @param list<array{jour: int, ouverture: int, fermeture: int}> $plages */
    private function prochaineOuverture(array $plages, CarbonImmutable $local): ?CarbonImmutable
    {
        $prochaine = null;
        for ($decalage = 0; $decalage <= 7; $decalage++) {
            $date = $local->startOfDay()->addDays($decalage);
            foreach ($plages as $plage) {
                if ($plage['jour'] !== $date->dayOfWeek) {
                    continue;
                }
                $ouverture = $date->addMinutes($plage['ouverture']);
                if ($ouverture->greaterThan($local) && ($prochaine === null || $ouverture->lessThan($prochaine))) {
                    $prochaine = $ouverture;
                }
            }
            if ($prochaine !== null) {
                break;
            }
        }

        return $prochaine?->utc();
    }

    /** « HH:MM » ou « HH:MM:SS » en minutes depuis minuit ; « 24:00 » = 1440. */
    public static function minutes(string $heure): int
    {
        if (preg_match('/^(\d{1,2}):(\d{2})(?::\d{2})?$/', $heure, $m) !== 1) {
            throw new InvalidArgumentException("Heure invalide : {$heure}");
        }
        $total = (int) $m[1] * 60 + (int) $m[2];
        if ((int) $m[2] > 59 || $total > 1440) {
            throw new InvalidArgumentException("Heure invalide : {$heure}");
        }

        return $total;
    }

    /** Minutes depuis minuit en « HH:MM » (1440 = « 24:00 »). */
    private static function heure(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }

    /** Heure du matin (locale) qui sépare « jusqu'à 02:00 » de « toute la nuit ». */
    public const HEURE_MATIN = 8;

    /**
     * Heure locale de fin d'une garde (« 02:00 ») si elle se termine avant le prochain matin
     * (08:00 locale), sinon null : la garde couvre toute la nuit. Champ `garde.jusqua` de l'app.
     */
    public static function finAvantLeMatin(CarbonImmutable $fin, CarbonInterface $maintenant, string $fuseau): ?string
    {
        $local = CarbonImmutable::instance($maintenant)->setTimezone($fuseau);
        $matin = $local->setTime(self::HEURE_MATIN, 0);
        if ($local->greaterThanOrEqualTo($matin)) {
            $matin = $matin->addDay();
        }
        $finLocale = $fin->setTimezone($fuseau);

        return $finLocale->lessThan($matin) ? $finLocale->format('H:i') : null;
    }
}
