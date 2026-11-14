<?php

declare(strict_types=1);

namespace App\Commun\Support;

use LogicException;

/**
 * Découpe et remise en état des numéros de téléphone saisis à la main ou recopiés d'un PDF.
 * Sert à l'import CSV des pharmacies et à la liste de garde officielle.
 *
 *   « 27 21 32 39 90 / 01 71 28 85 72 »  deux numéros ;
 *   « 27 35 91 36 04/33 82 »             fin abrégée : le second est 27 35 91 33 82 ;
 *   « 27 / 23 22 85 02 »                 numéro coupé par erreur : 27 23 22 85 02, signalé.
 *
 * Les corrections ne s'appliquent qu'aux pays dont le plan de numérotation est connu ;
 * ailleurs, chaque morceau est lu tel quel. Rien n'est corrigé en silence : chaque correction
 * donne un avertissement, un morceau qu'on ne sait pas lire est rendu tel quel.
 */
final class NumerosTelephone
{
    /** Plans de numérotation connus, par indicatif : longueur du numéro national et débuts possibles. */
    private const PLANS = [
        // Côte d'Ivoire, 10 chiffres depuis 2021 : fixes 21, 25, 27 ; mobiles 01, 05, 07.
        '225' => ['longueur' => 10, 'prefixes' => ['01', '05', '07', '21', '25', '27']],
    ];

    /** @param array{longueur: int, prefixes: list<string>}|null $plan */
    private function __construct(private readonly string $indicatif, private readonly ?array $plan) {}

    /** @param string $indicatif « +225 » ou « 225 » */
    public static function pour(string $indicatif): self
    {
        $indicatif = ltrim(trim($indicatif), '+');

        return new self($indicatif, self::PLANS[$indicatif] ?? null);
    }

    /**
     * Une cellule de tableur : numéros séparés par « / » ou « | », au format national ou international.
     * Un numéro complet au début inhabituel (« 28 … ») est gardé avec un avertissement : la saisie
     * à la main se trompe rarement de longueur, plus souvent d'un chiffre.
     */
    public function lire(string $cellule): NumerosLus
    {
        $morceaux = [];
        $illisibles = [];
        foreach (preg_split('/[\/|]/', $cellule) ?: [] as $brut) {
            $brut = trim($brut);
            if ($brut === '') {
                continue;
            }
            $chiffres = preg_replace('/\D/', '', $brut) ?? '';
            if ($chiffres === '') {
                $illisibles[] = $brut;

                continue;
            }
            $morceaux[] = $this->morceau($brut, $chiffres);
        }

        if ($this->plan === null) {
            $numeros = [];
            foreach ($morceaux as $morceau) {
                $numero = str_starts_with($morceau, '+') ? $morceau : '+'.$this->indicatif.$morceau;
                if ($this->indicatif !== '' && preg_match('/^\+\d{8,15}$/', $numero) === 1) {
                    $numeros[] = $numero;
                } else {
                    $illisibles[] = $morceau;
                }
            }

            return new NumerosLus(array_values(array_unique($numeros)), $illisibles, []);
        }

        $lus = $this->nationaux($morceaux, prefixeInhabituelAccepte: true);

        return new NumerosLus(
            array_values(array_unique(array_map(fn (string $n): string => $this->international($n), $lus['numeros']))),
            array_merge($illisibles, $lus['illisibles']),
            $lus['avertissements'],
        );
    }

    /**
     * Numéros nationaux contenus dans des morceaux de chiffres, dans l'ordre (un morceau = ce qui
     * est entre deux séparateurs). Un morceau qui commence par « + » est un numéro étranger, gardé tel quel.
     *
     * @param  list<string>  $morceaux
     * @return array{numeros: list<string>, illisibles: list<string>, avertissements: list<string>}
     */
    public function nationaux(array $morceaux, bool $prefixeInhabituelAccepte = false): array
    {
        if ($this->plan === null) {
            throw new LogicException("Plan de numérotation inconnu pour l'indicatif +{$this->indicatif}.");
        }
        $longueur = $this->plan['longueur'];
        $morceaux = array_values(array_filter($morceaux, fn (string $m): bool => $m !== ''));
        $numeros = [];
        $illisibles = [];
        $avertissements = [];
        $dernierNational = null;

        for ($k = 0, $total = count($morceaux); $k < $total; $k++) {
            $morceau = $morceaux[$k];
            if (str_starts_with($morceau, '+')) {
                if (preg_match('/^\+\d{8,15}$/', $morceau) === 1) {
                    $numeros[] = $morceau;
                } else {
                    $illisibles[] = $morceau;
                }

                continue;
            }
            if ($prefixeInhabituelAccepte && strlen($morceau) === $longueur && ! $this->valide($morceau)) {
                $numeros[] = $dernierNational = $morceau;
                $avertissements[] = 'Numéro au début inhabituel, à vérifier : '.self::lisible($morceau).'.';

                continue;
            }

            $i = 0;
            $taille = strlen($morceau);
            while ($i < $taille) {
                $reste = substr($morceau, $i);
                $tete = substr($reste, 0, $longueur);
                $suivant = $morceaux[$k + 1] ?? null;
                if ($this->valide($tete)) {
                    $numeros[] = $dernierNational = $tete;
                    $i += $longueur;
                } elseif (strlen($reste) < $longueur && $suivant !== null && ! str_starts_with($suivant, '+')
                    && ! $this->valide(substr($suivant, 0, $longueur)) && $this->valide($reste.$suivant)) {
                    // « 27 / 23 22 85 02 » : un séparateur tapé au milieu du numéro.
                    $numeros[] = $dernierNational = $reste.$suivant;
                    $avertissements[] = 'Numéro corrigé, à vérifier : « '.self::lisible($reste).' / '.self::lisible($suivant).' » lu '.self::lisible($reste.$suivant).'.';
                    $k++;
                    $i = $taille;
                } elseif (strlen($reste) < $longueur && strlen($reste) % 2 === 0 && $dernierNational !== null) {
                    // « 27 35 91 36 04/33 82 » : seule la fin du numéro précédent change.
                    $numeros[] = $dernierNational = substr($dernierNational, 0, $longueur - strlen($reste)).$reste;
                    // Après un séparateur, 2 ou 4 chiffres sont l'écriture habituelle ; au-delà, ou collés, c'est une correction.
                    if ($i > 0 || strlen($reste) > 4) {
                        $avertissements[] = 'Numéro corrigé, à vérifier : fin « '.self::lisible($reste).' » lue '.self::lisible($dernierNational).'.';
                    }
                    $i = $taille;
                } elseif ($reste[0] === '1') {
                    // Aucun numéro ne commence par 1 : c'est une barre « / » mal lue.
                    $avertissements[] = 'Chiffre « 1 » ignoré entre deux numéros, à vérifier.';
                    $i++;
                } else {
                    $illisibles[] = $reste;
                    $i = $taille;
                }
            }
        }

        return ['numeros' => $numeros, 'illisibles' => $illisibles, 'avertissements' => $avertissements];
    }

    /** « 0707123456 » → « +2250707123456 » */
    public function international(string $national): string
    {
        return str_starts_with($national, '+') ? $national : '+'.$this->indicatif.$national;
    }

    /** Clé de comparaison entre deux écritures d'un même numéro (« +225 07… » et « 07… »). */
    public static function dixChiffres(?string $telephone): ?string
    {
        $chiffres = preg_replace('/\D/', '', (string) $telephone) ?? '';

        return strlen($chiffres) >= 10 ? substr($chiffres, -10) : null;
    }

    /** « 2723228502 » → « 27 23 22 85 02 » */
    public static function lisible(string $chiffres): string
    {
        return trim(chunk_split($chiffres, 2, ' '));
    }

    /** Morceau national (chiffres) ou étranger (« +… ») ; l'indicatif du pays est retiré. */
    private function morceau(string $brut, string $chiffres): string
    {
        $international = str_starts_with($brut, '+') || str_starts_with($chiffres, '00');
        if (str_starts_with($chiffres, '00')) {
            $chiffres = substr($chiffres, 2);
        }
        $longueur = $this->plan['longueur'] ?? null;
        if ($this->indicatif !== '' && str_starts_with($chiffres, $this->indicatif)
            && ($longueur !== null ? strlen($chiffres) === strlen($this->indicatif) + $longueur : strlen($chiffres) > 10)) {
            return substr($chiffres, strlen($this->indicatif));
        }

        return $international ? '+'.$chiffres : $chiffres;
    }

    private function valide(string $chiffres): bool
    {
        return $this->plan !== null
            && strlen($chiffres) === $this->plan['longueur']
            && in_array(substr($chiffres, 0, 2), $this->plan['prefixes'], true);
    }
}
