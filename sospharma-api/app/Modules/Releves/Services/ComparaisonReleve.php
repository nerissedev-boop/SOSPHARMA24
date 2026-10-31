<?php

declare(strict_types=1);

namespace App\Modules\Releves\Services;

use App\Commun\Geo\Distance;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypeReleve;
use App\Modules\Releves\Models\Releve;

/**
 * Comparaison avant / après, champ par champ, pour le back-office.
 * Avant : la fiche actuelle (relevé pas encore validé) ou l'instantané pris à la validation.
 */
final class ComparaisonReleve
{
    public function __construct(private readonly EditionFichesPharmacies $fiches) {}

    /** @return list<array{champ: string, avant: mixed, apres: mixed, modifie: bool}> */
    public function comparer(Releve $releve): array
    {
        $avant = null;
        if ($releve->type === TypeReleve::MiseAJour) {
            $avant = $releve->statut === StatutReleve::Valide && $releve->fiche_avant !== null
                ? $releve->fiche_avant
                : ($releve->pharmacie_id !== null ? $this->fiches->parId($releve->pharmacie_id)?->enTableau() : null);
        }

        $apres = $releve->champsRetenus();
        unset($apres['assurances_proposees']);
        $apres['position'] = ['lat' => $releve->lat(), 'lng' => $releve->lng()];

        $lignes = [];
        foreach ($apres as $champ => $valeur) {
            $ancienne = $avant[$champ] ?? null;
            $ligne = [
                'champ' => (string) $champ,
                'avant' => $ancienne,
                'apres' => $valeur,
                'modifie' => self::normaliser($ancienne) !== self::normaliser($valeur),
            ];
            if ($champ === 'position' && is_array($ancienne) && isset($ancienne['lat'], $ancienne['lng'])) {
                $ligne['ecart_m'] = Distance::metres((float) $ancienne['lat'], (float) $ancienne['lng'], $releve->lat(), $releve->lng());
            }
            $lignes[] = $ligne;
        }

        return $lignes;
    }

    /** Représentation stable pour comparer (listes triées, nombres en chaînes). */
    private static function normaliser(mixed $valeur): string
    {
        if (is_array($valeur)) {
            $valeur = array_map(fn ($v) => is_array($v) ? self::normaliser($v) : $v, $valeur);
            if (array_is_list($valeur)) {
                sort($valeur);
            } else {
                ksort($valeur);
            }
        }

        return (string) json_encode($valeur, JSON_UNESCAPED_UNICODE);
    }
}
