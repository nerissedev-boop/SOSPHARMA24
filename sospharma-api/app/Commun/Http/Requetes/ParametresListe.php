<?php

declare(strict_types=1);

namespace App\Commun\Http\Requetes;

use App\Commun\Erreurs\RequeteInvalide;
use Illuminate\Http\Request;

/**
 * Lecture des paramètres de liste communs : filter[...], sort, q, page, per_page, cursor.
 * Chaque route déclare sa liste blanche ; tout le reste est refusé en BAD_REQUEST.
 */
final class ParametresListe
{
    public const PAR_PAGE_DEFAUT = 20;

    public const PAR_PAGE_MAX = 100;

    /**
     * @param  array<string, string>  $filtres  filtre => valeur
     * @param  list<array{0: string, 1: 'asc'|'desc'}>  $tris  colonnes (déjà traduites) et sens
     */
    private function __construct(
        public readonly array $filtres,
        public readonly array $tris,
        public readonly ?string $q,
        public readonly int $page,
        public readonly int $parPage,
    ) {}

    /**
     * @param  list<string>  $filtresAutorises
     * @param  array<string, string>  $trisAutorises  nom public => colonne SQL
     * @param  array{0: string, 1: 'asc'|'desc'}|null  $triParDefaut
     */
    public static function depuis(
        Request $request,
        array $filtresAutorises = [],
        array $trisAutorises = [],
        bool $rechercheAutorisee = false,
        ?array $triParDefaut = null,
    ): self {
        $filtres = $request->query('filter', []);
        if (! is_array($filtres)) {
            throw new RequeteInvalide('Le paramètre « filter » doit être de la forme filter[nom]=valeur.');
        }

        $inconnus = array_diff(array_keys($filtres), $filtresAutorises);
        if ($inconnus !== []) {
            throw new RequeteInvalide(
                'Filtre non autorisé : '.implode(', ', $inconnus).'.',
                ['filter' => ['Filtres acceptés : '.($filtresAutorises === [] ? 'aucun' : implode(', ', $filtresAutorises)).'.']],
            );
        }

        $propres = [];
        foreach ($filtres as $nom => $valeur) {
            if (! is_scalar($valeur) || (string) $valeur === '') {
                throw new RequeteInvalide("Le filtre « {$nom} » doit avoir une valeur.");
            }
            $propres[(string) $nom] = (string) $valeur;
        }

        $tris = [];
        $sort = $request->query('sort');
        if ($sort !== null) {
            if (! is_string($sort) || $sort === '') {
                throw new RequeteInvalide('Le paramètre « sort » est invalide.');
            }
            foreach (explode(',', $sort) as $champ) {
                $sens = str_starts_with($champ, '-') ? 'desc' : 'asc';
                $nom = ltrim($champ, '-');
                if (! array_key_exists($nom, $trisAutorises)) {
                    throw new RequeteInvalide(
                        "Tri non autorisé : {$nom}.",
                        ['sort' => ['Tris acceptés : '.($trisAutorises === [] ? 'aucun' : implode(', ', array_keys($trisAutorises))).'.']],
                    );
                }
                $tris[] = [$trisAutorises[$nom], $sens];
            }
        } elseif ($triParDefaut !== null) {
            $tris[] = $triParDefaut;
        }

        $q = $request->query('q');
        if ($q !== null) {
            if (! $rechercheAutorisee) {
                throw new RequeteInvalide('La recherche « q » n\'est pas disponible sur cette route.');
            }
            if (! is_string($q) || mb_strlen(trim($q)) < 2 || mb_strlen($q) > 100) {
                throw new RequeteInvalide('La recherche « q » doit contenir entre 2 et 100 caractères.');
            }
            $q = trim($q);
        }

        return new self($propres, $tris, $q, self::entier($request, 'page', 1, 1, PHP_INT_MAX), self::entier($request, 'per_page', self::PAR_PAGE_DEFAUT, 1, self::PAR_PAGE_MAX));
    }

    public function filtre(string $nom): ?string
    {
        return $this->filtres[$nom] ?? null;
    }

    /** Filtre booléen : 1/0, true/false, oui/non. */
    public function filtreBooleen(string $nom): ?bool
    {
        $valeur = $this->filtre($nom);
        if ($valeur === null) {
            return null;
        }

        return match (strtolower($valeur)) {
            '1', 'true', 'oui' => true,
            '0', 'false', 'non' => false,
            default => throw new RequeteInvalide("Le filtre « {$nom} » attend true ou false."),
        };
    }

    /**
     * Filtre limité à une liste de valeurs.
     *
     * @param  list<string>  $valeurs
     */
    public function filtreParmi(string $nom, array $valeurs): ?string
    {
        $valeur = $this->filtre($nom);
        if ($valeur !== null && ! in_array($valeur, $valeurs, true)) {
            throw new RequeteInvalide("Valeur invalide pour le filtre « {$nom} ».", ['filter' => ['Valeurs acceptées : '.implode(', ', $valeurs).'.']]);
        }

        return $valeur;
    }

    /**
     * Applique les tris à une requête Eloquent ou Query Builder.
     *
     * @template T of \Illuminate\Contracts\Database\Query\Builder
     *
     * @param  T  $requete
     * @return T
     */
    public function trier($requete)
    {
        foreach ($this->tris as [$colonne, $sens]) {
            $requete->orderBy($colonne, $sens);
        }

        return $requete;
    }

    private static function entier(Request $request, string $nom, int $defaut, int $min, int $max): int
    {
        $valeur = $request->query($nom);
        if ($valeur === null) {
            return $defaut;
        }
        if (! is_string($valeur) || preg_match('/^\d+$/', $valeur) !== 1 || (int) $valeur < $min || (int) $valeur > $max) {
            throw new RequeteInvalide("Le paramètre « {$nom} » doit être un entier entre {$min} et {$max}.");
        }

        return (int) $valeur;
    }
}
