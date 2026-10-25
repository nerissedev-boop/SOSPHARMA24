<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\RequeteInvalide;
use App\Commun\Http\Requetes\ParametresListe;
use App\Modules\Pharmacies\Enums\StatutOuverture;
use Illuminate\Contracts\Database\Eloquent\Builder;

/**
 * Filtres communs des listes publiques : filter[statut], filter[h24],
 * filter[assurances]=cmu,mugef-ci (pharmacies qui acceptent AU MOINS UNE des assurances, par slug).
 */
final class FiltresPharmacies
{
    public const NOMS = ['statut', 'h24', 'assurances'];

    public const ASSURANCES_MAX = 10;

    /** @param list<string>|null $assurances slugs */
    public function __construct(
        public readonly ?StatutOuverture $statut = null,
        public readonly ?bool $h24 = null,
        public readonly ?array $assurances = null,
    ) {}

    public static function depuis(ParametresListe $p): self
    {
        $statut = $p->filtreParmi('statut', array_column(StatutOuverture::cases(), 'value'));

        return new self(
            $statut !== null ? StatutOuverture::from($statut) : null,
            $p->filtreBooleen('h24'),
            self::slugs($p->filtre('assurances')),
        );
    }

    /** @return list<string>|null */
    public static function slugs(?string $valeur): ?array
    {
        if ($valeur === null) {
            return null;
        }
        $slugs = array_values(array_unique(array_filter(array_map(fn (string $s): string => mb_strtolower(trim($s)), explode(',', $valeur)))));
        if ($slugs === [] || count($slugs) > self::ASSURANCES_MAX) {
            throw new RequeteInvalide('Le filtre « assurances » attend de 1 à '.self::ASSURANCES_MAX.' slugs séparés par des virgules.');
        }
        foreach ($slugs as $slug) {
            if (preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) !== 1) {
                throw new RequeteInvalide("Slug d'assurance invalide : {$slug}.", ['filter' => ['Exemple : filter[assurances]=cmu,mugef-ci']]);
            }
        }

        return $slugs;
    }

    /**
     * « Au moins une » des assurances (actives) choisies.
     *
     * @template T of Builder
     *
     * @param  T  $requete  requête sur les pharmacies
     * @param  list<string>  $slugs
     * @return T
     */
    public static function appliquerAssurances($requete, array $slugs)
    {
        return $requete->whereHas('assurances', fn ($a) => $a->where('assurances.actif', true)->whereIn('assurances.slug', $slugs));
    }
}
