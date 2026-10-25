<?php

declare(strict_types=1);

namespace App\Commun\Support;

use App\Commun\Erreurs\DonneesInvalides;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use SplFileObject;
use Throwable;

/**
 * Lecture d'un CSV d'import (séparateur « ; » ou « , » détecté, UTF-8 avec ou sans BOM).
 * La première ligne contient les noms de colonnes.
 */
final class LecteurCsv
{
    public const LIGNES_MAX = 5000;

    /**
     * @param  list<string>  $colonnesObligatoires
     * @return list<array{ligne: int, valeurs: array<string, string>}>  ligne = numéro dans le fichier (en-tête = 1)
     */
    public static function lire(UploadedFile $fichier, array $colonnesObligatoires): array
    {
        try {
            $csv = new SplFileObject((string) $fichier->getRealPath(), 'r');
            $premiere = (string) $csv->fgets();
            $separateur = substr_count($premiere, ';') >= substr_count($premiere, ',') ? ';' : ',';
            $csv->rewind();
            $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD | SplFileObject::DROP_NEW_LINE);
            $csv->setCsvControl($separateur, '"', '\\');

            $entete = null;
            $lignes = [];
            foreach ($csv as $index => $champs) {
                if (! is_array($champs) || $champs === [null]) {
                    continue;
                }
                $champs = array_map(fn ($v): string => trim((string) $v), $champs);
                if ($entete === null) {
                    $champs[0] = preg_replace('/^\xEF\xBB\xBF/', '', $champs[0]) ?? $champs[0];
                    $entete = array_map(fn (string $c): string => mb_strtolower($c), $champs);

                    continue;
                }
                if (count($lignes) >= self::LIGNES_MAX) {
                    throw new DonneesInvalides('Le fichier dépasse '.self::LIGNES_MAX.' lignes.', ['fichier' => ['Fichier trop long.']]);
                }
                $valeurs = [];
                foreach ($entete as $position => $colonne) {
                    $valeurs[$colonne] = $champs[$position] ?? '';
                }
                $lignes[] = ['ligne' => (int) $index + 1, 'valeurs' => $valeurs];
            }
        } catch (DonneesInvalides $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::warning('Fichier CSV illisible', ['nom' => $fichier->getClientOriginalName(), 'erreur' => $e->getMessage()]);

            throw new DonneesInvalides('Le fichier CSV n\'a pas pu être lu.', ['fichier' => ['Fichier illisible.']], $e);
        }

        if ($entete === null) {
            throw new DonneesInvalides('Le fichier CSV est vide.', ['fichier' => ['Fichier vide.']]);
        }
        $manquantes = array_diff($colonnesObligatoires, $entete);
        if ($manquantes !== []) {
            throw new DonneesInvalides(
                'Colonnes manquantes dans le fichier : '.implode(', ', $manquantes).'.',
                ['fichier' => ['Colonnes attendues : '.implode(', ', $colonnesObligatoires).'.']],
            );
        }
        if ($lignes === []) {
            throw new DonneesInvalides('Le fichier CSV ne contient aucune ligne de données.', ['fichier' => ['Aucune ligne.']]);
        }

        return $lignes;
    }
}
