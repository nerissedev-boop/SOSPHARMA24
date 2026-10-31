<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * Lecture du texte de la liste de garde officielle (copié d'un PDF, souvent passé par une
 * reconnaissance de caractères) :
 *
 *   SEMAINE DU SAMEDI 24 AU VENDREDI 30 OCTOBRE 2026
 *   ABENGOUROU PHCIE DE L'INDENIE / M. KOFFI JOSEPH - TEL. 27 35 91 36 04/33 82
 *   VOIE PRINCIPALE A COTE DE LA GRANDE MOSQUEE
 *
 * La ville (ou la commune) n'est écrite qu'une fois, devant la première pharmacie ou seule sur
 * sa ligne. Erreurs de lecture corrigées : « / » lu « 1 », lettres prises pour des chiffres
 * (« og » pour « 09 ») et numéros abrégés (« 36 04/33 82 »). Rien n'est deviné en silence :
 * un numéro corrigé est signalé, un numéro illisible est rendu tel quel.
 */
final class LectureListeGarde
{
    /** Numéros ivoiriens à 10 chiffres : fixes 21, 25, 27 ; mobiles 01, 05, 07. */
    private const PREFIXES = ['01', '05', '07', '21', '25', '27'];

    /** Lettres que la reconnaissance de caractères confond avec des chiffres. */
    private const SOSIES = ['o' => '0', 'O' => '0', 'g' => '9', 'l' => '1', 'I' => '1', '|' => '1', 'S' => '5', 'B' => '8'];

    /** Mots de repère : une ligne qui en contient n'est pas un nom de ville. */
    private const MOTS_REPERE = [
        'A', 'AU', 'AUX', 'EN', 'DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'ET', 'SUR', 'PRES', 'FACE', 'COTE', 'ENTRE', 'DERRIERE',
        'QUARTIER', 'RUE', 'ROUTE', 'AVENUE', 'BOULEVARD', 'BD', 'VOIE', 'AXE', 'CARREFOUR', 'MARCHE', 'GARE', 'CITE',
        'RESIDENCE', 'IMMEUBLE', 'COMMERCE', 'ENTREE', 'EXTENSION', 'ECOLE', 'COLLEGE', 'LYCEE', 'EGLISE', 'MOSQUEE',
        'SUD', 'NORD', 'EST', 'OUEST', 'CENTRE', 'ZONE', 'LOT', 'ILOT',
    ];

    private const MOIS = [
        'JANVIER' => 1, 'FEVRIER' => 2, 'MARS' => 3, 'AVRIL' => 4, 'MAI' => 5, 'JUIN' => 6,
        'JUILLET' => 7, 'AOUT' => 8, 'SEPTEMBRE' => 9, 'OCTOBRE' => 10, 'NOVEMBRE' => 11, 'DECEMBRE' => 12,
    ];

    /** @param list<string> $sectionsConnues noms des villes et communes en base : reconnus seuls sur leur ligne */
    public function lire(string $texte, array $sectionsConnues = []): ListeGardeLue
    {
        $connues = [];
        foreach ($sectionsConnues as $nom) {
            $connues[self::cle($nom)] = true;
        }

        $texte = strtr($texte, ["\u{2019}" => "'", "\u{2013}" => '-', "\u{2014}" => '-', "\u{00A0}" => ' ']);
        $lignes = array_values(array_filter(
            array_map('trim', preg_split('/\R/u', $texte) ?: []),
            fn (string $l): bool => $l !== '' && preg_match('/^(TOUR DE GARDE|SEMAINE DU|PERMANENCE|PAGE\s+\d)/i', $l) !== 1,
        ));
        [$premierJour, $dernierJour] = $this->periode($texte);

        $blocs = [];
        $courant = null;
        $section = null;
        foreach ($lignes as $i => $ligne) {
            $debut = $this->debutEntree($ligne);
            if ($debut !== null) {
                $section = $debut[0] ?? $section;
                if ($courant !== null) {
                    $blocs[] = $courant;
                }
                $courant = ['section' => $section, 'lignes' => [$debut[1]]];

                continue;
            }
            if ($this->estSection($ligne, $connues, $lignes[$i + 1] ?? '')) {
                $section = self::espaces($ligne);
                if ($courant !== null) {
                    $blocs[] = $courant;
                    $courant = null;
                }

                continue;
            }
            // Ligne de suite (repère, numéros coupés, « TEL. » renvoyé à la ligne) ; avant la 1re pharmacie : ignorée.
            if ($courant !== null) {
                $courant['lignes'][] = $ligne;
            }
        }
        if ($courant !== null) {
            $blocs[] = $courant;
        }

        return new ListeGardeLue($premierJour, $dernierJour, array_map(fn (array $b): EntreeListeGarde => $this->entree($b['section'], $b['lignes']), $blocs));
    }

    /** Majuscules sans accents ni ponctuation : « Bouaké » et « BOUAKE » se rejoignent. */
    public static function cle(string $nom): string
    {
        return preg_replace('/[^A-Z0-9]/', '', Str::upper(Str::ascii($nom))) ?? '';
    }

    /** @return array{0: string|null, 1: string}|null [ville annoncée devant, reste de la ligne] */
    private function debutEntree(string $ligne): ?array
    {
        if (preg_match('/^(.*?)\b(P?HC[I1L]E|PCIE|PHARMACIE)\b\.?\s*(.*)$/iu', $ligne, $m) !== 1) {
            return null;
        }
        $prefixe = trim($m[1], " \t-/");
        if ($prefixe === '') {
            return [null, $m[3]];
        }

        // « EN FACE DE LA PHARMACIE … » est un repère, pas une nouvelle pharmacie.
        return $this->ressembleAVille($prefixe, 4) ? [self::espaces($prefixe), $m[3]] : null;
    }

    /** @param array<string, true> $connues */
    private function estSection(string $ligne, array $connues, string $suivante): bool
    {
        if (preg_match('/\d/', $ligne) === 1) {
            return false;
        }
        if (isset($connues[self::cle($ligne)])) {
            return true;
        }
        // Ville absente de la base, seule sur sa ligne : un ou deux mots juste avant une pharmacie sans ville devant.
        $suite = $this->debutEntree($suivante);

        return $suite !== null && $suite[0] === null && $this->ressembleAVille($ligne, 2);
    }

    private function ressembleAVille(string $texte, int $motsMax): bool
    {
        if (preg_match("/^\\p{Lu}[\\p{Lu}'\\- ]*$/u", $texte) !== 1) {
            return false;
        }
        $mots = preg_split("/[\\s'\\-]+/", Str::upper(Str::ascii($texte)), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return count($mots) <= $motsMax && array_intersect($mots, self::MOTS_REPERE) === [];
    }

    /** @param list<string> $lignes */
    private function entree(?string $section, array $lignes): EntreeListeGarde
    {
        $plat = self::espaces(implode(' ', $lignes));
        if (preg_match('/^(.*?)\bT[EÉ]L\b\.?\s*:?\s*(.*)$/iu', $plat, $m) === 1) {
            [$tete, $queue] = [$m[1], $m[2]];
        } else {
            [$tete, $queue] = [self::espaces($lignes[0]), self::espaces(implode(' ', array_slice($lignes, 1)))];
        }

        [$nom, $pharmacien, $nouvelle] = $this->nomEtPharmacien($tete);
        [$telephones, $invalides, $corriges, $repere] = $this->telephonesEtRepere($queue);

        return new EntreeListeGarde($section, $nom, $pharmacien, $telephones, $invalides, $corriges, $repere, $nouvelle, implode("\n", $lignes));
    }

    /** @return array{0: string, 1: string|null, 2: bool} */
    private function nomEtPharmacien(string $tete): array
    {
        $pharmacien = null;
        if (preg_match('/^(.*?)(?:^|[\s\/])(MME|MLLE|MR\.?|M\.|DR\.?)\s*(\S.*)$/u', $tete, $m) === 1) {
            $tete = $m[1];
            $pharmacien = trim($m[2].' '.$m[3], " \t-/.,") ?: null;
        }

        $nouvelle = preg_match('/\b(NOUVELLE|NVLLE|NLLE)\b/i', $tete) === 1;
        $nom = preg_replace(['/\(\s*(NOUVELLE|NVLLE|NLLE)\s*\)|\b(NOUVELLE|NVLLE|NLLE)\b/i', '/\bSARL(\s+U)?\b/i'], ' ', $tete) ?? $tete;
        // « MOYA 1 » : la barre avant le pharmacien a été lue « 1 ».
        $nom = trim(self::espaces($nom), " \t-/.,|");
        $nom = trim(preg_replace('/\s+[1|]$/', '', $nom) ?? $nom);

        return [$nom, $pharmacien, $nouvelle];
    }

    /** @return array{0: list<string>, 1: list<string>, 2: bool, 3: string|null} */
    private function telephonesEtRepere(string $queue): array
    {
        $jetons = preg_split('/([\/,;]|\s-\s)|\s+/u', $queue, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY | PREG_SPLIT_OFFSET_CAPTURE) ?: [];
        $segments = [''];
        $corriges = false;
        $finNumeros = strlen($queue);
        foreach ($jetons as [$jeton, $position]) {
            if (preg_match('/^([\/,;]|\s*-\s*)$/', $jeton) === 1) {
                $segments[] = '';

                continue;
            }
            $chiffres = $this->enChiffres($jeton, $segments[count($segments) - 1] !== '', $corriges);
            if ($chiffres === null) {
                $finNumeros = $position;

                break;
            }
            $segments[count($segments) - 1] .= $chiffres;
        }

        $numeros = [];
        $invalides = [];
        foreach ($segments as $segment) {
            if ($segment !== '') {
                $this->numerosDuSegment($segment, $numeros, $invalides, $corriges);
            }
        }

        $repere = substr($queue, $finNumeros);
        // « RUE PRINCESSE 1 PETIT BASSAM » : barre lue « 1 » entre deux mots.
        $repere = preg_replace('/(?<=\p{L}) [1|] (?=\p{L})/u', ' / ', $repere) ?? $repere;
        $repere = trim(self::espaces($repere), " \t/-,.;");

        return [array_values(array_unique($numeros)), $invalides, $corriges, $repere !== '' ? $repere : null];
    }

    /** Chiffres d'un morceau de numéro, ou null s'il s'agit déjà du repère. */
    private function enChiffres(string $jeton, bool $apresChiffres, bool &$corriges): ?string
    {
        $jeton = trim($jeton, '.:');
        if ($jeton === '' || preg_match('/^\d+$/', $jeton) === 1) {
            return $jeton;
        }
        // « og » ou « 4S » : sosies de chiffres, seulement collés à de vrais chiffres (ou court, juste après).
        if (preg_match('/^[\doOglI|SB]+$/', $jeton) === 1 && (preg_match('/\d/', $jeton) === 1 || ($apresChiffres && strlen($jeton) <= 2))) {
            $corriges = true;

            return strtr($jeton, self::SOSIES);
        }

        return null;
    }

    /**
     * @param  list<string>  $numeros
     * @param  list<string>  $invalides
     */
    private function numerosDuSegment(string $segment, array &$numeros, array &$invalides, bool &$corriges): void
    {
        $i = 0;
        $longueur = strlen($segment);
        while ($i < $longueur) {
            $reste = substr($segment, $i);
            $morceau = substr($reste, 0, 10);
            if (strlen($morceau) === 10 && in_array(substr($morceau, 0, 2), self::PREFIXES, true)) {
                $numeros[] = $morceau;
                $i += 10;
            } elseif (in_array(strlen($reste), [2, 4, 6, 8], true) && $numeros !== []) {
                // « 27 35 91 36 04/33 82 » : la fin seule du numéro précédent change.
                $precedent = $numeros[count($numeros) - 1];
                $numeros[] = substr($precedent, 0, 10 - strlen($reste)).$reste;
                $corriges = $corriges || $i > 0 || strlen($reste) > 4;
                $i = $longueur;
            } elseif ($reste[0] === '1') {
                // Aucun numéro ne commence par 1 : c'est une barre « / » mal lue.
                $corriges = true;
                $i++;
            } else {
                $invalides[] = $reste;
                $i = $longueur;
            }
        }
    }

    /** @return array{0: CarbonImmutable|null, 1: CarbonImmutable|null} premier et dernier jour annoncés */
    private function periode(string $texte): array
    {
        $texte = Str::upper(Str::ascii($texte));
        $mois = implode('|', array_keys(self::MOIS));
        $motif = "/\\bDU\\s+(?:[A-Z]+\\s+)?(\\d{1,2})(?:\\s+({$mois}))?(?:\\s+(\\d{4}))?\\s+AU\\s+(?:[A-Z]+\\s+)?(\\d{1,2})\\s+({$mois})\\s+(\\d{4})/";
        if (preg_match($motif, $texte, $m) !== 1) {
            return [null, null];
        }
        $moisFin = self::MOIS[$m[5]];
        $anneeFin = (int) $m[6];
        $moisDebut = $m[2] !== '' ? self::MOIS[$m[2]] : $moisFin;
        $anneeDebut = $m[3] !== '' ? (int) $m[3] : ($moisDebut > $moisFin ? $anneeFin - 1 : $anneeFin);

        try {
            return [
                CarbonImmutable::createStrict($anneeDebut, $moisDebut, (int) $m[1]),
                CarbonImmutable::createStrict($anneeFin, $moisFin, (int) $m[4]),
            ];
        } catch (\Throwable) {
            // Date impossible (31 novembre…) : période à saisir à la main.
            return [null, null];
        }
    }

    private static function espaces(string $texte): string
    {
        return trim(preg_replace('/\s+/u', ' ', $texte) ?? $texte);
    }
}
