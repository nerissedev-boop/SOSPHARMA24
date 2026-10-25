<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Commun\Support\Dates;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Territoire\Services\ConfigurationPays;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Contrôle automatique d'un tour : chevauchement avec un tour publié, pharmacies inconnues
 * (désactivées ou d'une autre ville), gardes hors période, nuits sans aucune garde.
 */
final class ControleTourGarde
{
    /** Heure locale testée pour décider qu'une nuit est couverte. */
    private const HEURE_NUIT = '02:00';

    public function __construct(private readonly ConfigurationPays $configuration) {}

    /** @return list<ProblemeControle> */
    public function controler(TourGarde $tour): array
    {
        $tour->loadMissing('gardes.pharmacie');
        $problemes = [];

        foreach ($this->toursEnConflit($tour) as $autre) {
            $problemes[] = new ProblemeControle(
                ProblemeControle::CHEVAUCHEMENT,
                "Chevauche le tour publié du {$autre->debut->format('d/m/Y H:i')} au {$autre->fin->format('d/m/Y H:i')} (UTC).",
                ['tour' => $autre->id_public],
            );
        }

        if ($tour->gardes->isEmpty()) {
            $problemes[] = new ProblemeControle(ProblemeControle::TOUR_VIDE, 'Le tour ne contient aucune pharmacie de garde.');
        }

        foreach ($tour->gardes as $garde) {
            $pharmacie = $garde->pharmacie;
            if (! $pharmacie->actif) {
                $problemes[] = new ProblemeControle(ProblemeControle::PHARMACIE_INCONNUE, "{$pharmacie->nom} est désactivée.", ['pharmacie' => $pharmacie->id_public]);
            } elseif ($pharmacie->ville_id !== $tour->ville_id) {
                $problemes[] = new ProblemeControle(ProblemeControle::PHARMACIE_AUTRE_VILLE, "{$pharmacie->nom} n'est pas dans la ville du tour.", ['pharmacie' => $pharmacie->id_public]);
            }
            if ($garde->debut->lessThan($tour->debut) || $garde->fin->greaterThan($tour->fin) || ! $garde->debut->lessThan($garde->fin)) {
                $problemes[] = new ProblemeControle(ProblemeControle::GARDE_HORS_TOUR, "La garde de {$pharmacie->nom} sort de la période du tour.", ['pharmacie' => $pharmacie->id_public]);
            }
        }

        return [...$problemes, ...$this->nuitsSansGarde($tour, $tour->gardes)];
    }

    /** @return Collection<int, TourGarde> */
    public function toursEnConflit(TourGarde $tour): Collection
    {
        return TourGarde::query()
            ->publies()
            ->where('ville_id', $tour->ville_id)
            ->whereKeyNot($tour->id)
            ->where('debut', '<', $tour->fin->utc()->format('Y-m-d H:i:s'))
            ->where('fin', '>', $tour->debut->utc()->format('Y-m-d H:i:s'))
            // Un tour de toute la ville (sans secteur) chevauche tous les secteurs, et inversement.
            ->when($tour->secteur_garde_id !== null, fn (Builder $r) => $r->where(
                fn (Builder $s) => $s->whereNull('secteur_garde_id')->orWhere('secteur_garde_id', $tour->secteur_garde_id)
            ))
            ->orderBy('debut')
            ->get();
    }

    /**
     * @param  Collection<int, Garde>  $gardes
     * @return list<ProblemeControle>
     */
    private function nuitsSansGarde(TourGarde $tour, Collection $gardes): array
    {
        $fuseau = $this->configuration->fuseauDeVille($tour->ville_id);
        $jour = $tour->debut->setTimezone($fuseau)->startOfDay();
        $finLocale = $tour->fin->setTimezone($fuseau);
        [$h, $m] = array_map('intval', explode(':', self::HEURE_NUIT));

        $problemes = [];
        while ($jour->lessThan($finLocale)) {
            $nuit = $jour->setTime($h, $m);
            if ($nuit->greaterThanOrEqualTo($tour->debut) && $nuit->lessThan($tour->fin)) {
                $instant = Dates::versUtc($nuit);
                $couverte = $gardes->contains(fn (Garde $g): bool => $g->debut->lessThanOrEqualTo($instant) && $instant->lessThan($g->fin));
                if (! $couverte) {
                    $veille = $jour->subDay();
                    $problemes[] = new ProblemeControle(
                        ProblemeControle::NUIT_SANS_GARDE,
                        "Aucune pharmacie de garde la nuit du {$veille->format('d/m')} au {$jour->format('d/m')}.",
                        ['nuit' => $veille->format('Y-m-d')],
                    );
                }
            }
            $jour = $jour->addDay();
        }

        return $problemes;
    }
}
