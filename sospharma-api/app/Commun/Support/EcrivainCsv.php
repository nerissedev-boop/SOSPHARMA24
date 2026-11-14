<?php

declare(strict_types=1);

namespace App\Commun\Support;

/**
 * Écriture d'un CSV destiné à Excel et relu par LecteurCsv : séparateur « ; », UTF-8 avec BOM.
 *
 * Une cellule de texte qui commence par = + - @ prendrait la valeur d'une formule à l'ouverture dans un tableur :
 * elle reçoit une apostrophe devant, que LecteurCsv retire au réimport. Un nombre (« -3.97 ») reste tel quel.
 * Les retours à la ligne deviennent des espaces : LecteurCsv lit une ligne de fichier par ligne de données,
 * et les numéros de ligne de son bilan doivent rester ceux du tableur.
 */
final class EcrivainCsv
{
    public const BOM = "\xEF\xBB\xBF";

    public const SEPARATEUR = ';';

    /**
     * @param  resource  $flux
     * @param  list<string|null>  $valeurs
     */
    public static function ligne($flux, array $valeurs): void
    {
        // Échappement RFC 4180 (guillemet doublé), celui qu'attend Excel.
        fputcsv($flux, array_map(self::cellule(...), $valeurs), self::SEPARATEUR, '"', '', "\n");
    }

    public static function cellule(?string $valeur): string
    {
        $valeur = trim(preg_replace('/\s*[\r\n]+\s*/', ' ', (string) $valeur) ?? '');

        return preg_match('/^[=+\-@]/', $valeur) === 1 && ! is_numeric($valeur) ? "'".$valeur : $valeur;
    }
}
