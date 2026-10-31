<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\CompteAvecRole;
use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Services\ImportPharmaciesOsm;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Services\ConfigurationPays;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Import de la liste de garde officielle, après relecture : un brouillon de tour par ville (à
 * contrôler puis publier comme les autres), les fiches inconnues créées en « Position à
 * confirmer », et les fiches existantes complétées (numéro, adresse) sans rien écraser.
 *
 * Relançable : le brouillon de la même ville et de la même période est remplacé ; un tour déjà
 * publié n'est pas touché.
 */
final class ImportListeGarde
{
    public const RATTACHER = 'rattacher';

    public const CREER = 'creer';

    public const IGNORER = 'ignorer';

    public const ACTIONS = [self::RATTACHER, self::CREER, self::IGNORER];

    /** Relève comme le tour de démonstration : du samedi 08:00 au samedi suivant 08:00, heure locale. */
    public const HEURE_RELEVE = 8;

    public function __construct(
        private readonly RapprochementListeGarde $rapprochement,
        private readonly ConfigurationPays $configuration,
    ) {}

    /**
     * @param  array<int, array{action: string, pharmacie?: string|null}>  $decisions  par rang dans la liste (0, 1…) ; sans décision : action proposée
     * @return array{
     *     premier_jour: string, dernier_jour: string,
     *     tours: list<array{ville: string, tour: string|null, etat: string, gardes: int}>,
     *     fiches_creees: int, telephones_completes: int, adresses_completees: int,
     *     ignorees: list<array{rang: int, nom: string, raison: string}>
     * }
     */
    public function importer(
        string $texte,
        array $decisions = [],
        ?CompteAvecRole $auteur = null,
        ?CarbonImmutable $premierJour = null,
        ?CarbonImmutable $dernierJour = null,
        bool $simulation = false,
    ): array {
        [$liste, $resultats] = $this->rapprochement->analyser($texte);
        $premierJour ??= $liste->premierJour;
        $dernierJour ??= $liste->dernierJour;
        if ($premierJour === null || $dernierJour === null || $dernierJour->lessThan($premierJour)) {
            throw new DonneesInvalides('', ['periode' => ['Période introuvable dans l\'en-tête de la liste : indiquez le premier et le dernier jour.']]);
        }

        $bilan = [
            'premier_jour' => $premierJour->toDateString(),
            'dernier_jour' => $dernierJour->toDateString(),
            'tours' => [],
            'fiches_creees' => 0,
            'telephones_completes' => 0,
            'adresses_completees' => 0,
            'ignorees' => [],
        ];

        $travail = function () use ($resultats, $decisions, $auteur, $premierJour, $dernierJour, &$bilan): void {
            /** @var array<int, array<int, true>> $parVille */
            $parVille = [];
            foreach ($resultats as $rang => $resultat) {
                $decision = $decisions[$rang] ?? ['action' => $resultat->actionProposee()];
                $pharmacie = $this->appliquer($rang, $resultat, $decision, $bilan);
                if ($pharmacie !== null) {
                    $parVille[$pharmacie->ville_id][$pharmacie->id] = true;
                }
            }
            foreach ($parVille as $villeId => $pharmacies) {
                $bilan['tours'][] = $this->tour($villeId, array_keys($pharmacies), $premierJour, $dernierJour, $auteur);
            }
        };

        if ($simulation) {
            // Même chemin que l'import réel, annulé à la fin : le bilan est exact.
            DB::beginTransaction();
            try {
                $travail();
            } finally {
                DB::rollBack();
            }
        } else {
            DB::transaction($travail);
        }

        return $bilan;
    }

    /**
     * @param  array{action: string, pharmacie?: string|null}  $decision
     * @param  array<string, mixed>  $bilan
     */
    private function appliquer(int $rang, PharmacieRapprochee $resultat, array $decision, array &$bilan): ?Pharmacie
    {
        $entree = $resultat->entree;
        if ($decision['action'] === self::IGNORER) {
            $bilan['ignorees'][] = ['rang' => $rang, 'nom' => $entree->nom, 'raison' => match ($resultat->statut) {
                PharmacieRapprochee::A_VERIFIER => 'à vérifier, non confirmée',
                PharmacieRapprochee::INCONNUE => $resultat->villeId === null ? 'ville absente de la base' : 'écartée',
                default => 'écartée',
            }];

            return null;
        }

        if ($decision['action'] === self::CREER) {
            if ($resultat->villeId === null) {
                $bilan['ignorees'][] = ['rang' => $rang, 'nom' => $entree->nom, 'raison' => 'ville absente de la base'];

                return null;
            }
            $bilan['fiches_creees']++;

            return $this->creerFiche($resultat);
        }

        $pharmacie = isset($decision['pharmacie'])
            ? Pharmacie::query()->actives()->where('id_public', $decision['pharmacie'])->first()
            // Le rapprochement ne charge que quelques colonnes : fiche complète avant de la compléter.
            : $resultat->pharmacie?->fresh();
        if ($pharmacie === null) {
            throw new DonneesInvalides('', ["decisions.{$rang}.pharmacie" => ["Aucune fiche active à rattacher pour « {$entree->nom} »."]]);
        }
        $this->completer($pharmacie, $entree, $bilan);

        return $pharmacie;
    }

    private function creerFiche(PharmacieRapprochee $resultat): Pharmacie
    {
        $entree = $resultat->entree;

        return Pharmacie::query()->create([
            'ville_id' => $resultat->villeId,
            'zone_id' => $resultat->zoneId,
            'nom' => self::nomFiche($entree->nom),
            'adresse' => $entree->repere !== null ? Str::limit($entree->repere, 255, '') : ImportPharmaciesOsm::ADRESSE_INCONNUE,
            'telephone' => $entree->telephones !== [] ? $this->indicatif((int) $resultat->villeId).$entree->telephones[0] : null,
            // Position à confirmer : la liste n'en donne pas ; un relevé terrain la complétera.
            'latitude' => null,
            'longitude' => null,
            'h24' => false,
            'actif' => true,
        ]);
    }

    /** Complète les vides seulement : un numéro différent déjà sur la fiche reste en place (alerte au rapprochement). */
    private function completer(Pharmacie $pharmacie, EntreeListeGarde $entree, array &$bilan): void
    {
        $vides = [];
        if (($pharmacie->telephone ?? '') === '' && $entree->telephones !== []) {
            $vides['telephone'] = $this->indicatif($pharmacie->ville_id).$entree->telephones[0];
            $bilan['telephones_completes']++;
        }
        if ($pharmacie->adresse === ImportPharmaciesOsm::ADRESSE_INCONNUE && $entree->repere !== null) {
            $vides['adresse'] = Str::limit($entree->repere, 255, '');
            $bilan['adresses_completees']++;
        }
        if ($vides !== []) {
            $pharmacie->update($vides);
        }
    }

    /**
     * @param  list<int>  $pharmacies
     * @return array{ville: string, tour: string|null, etat: string, gardes: int}
     */
    private function tour(int $villeId, array $pharmacies, CarbonImmutable $premierJour, CarbonImmutable $dernierJour, ?CompteAvecRole $auteur): array
    {
        $fuseau = $this->configuration->fuseauDeVille($villeId);
        $debut = CarbonImmutable::create($premierJour->year, $premierJour->month, $premierJour->day, self::HEURE_RELEVE, 0, 0, $fuseau)->utc();
        $fin = CarbonImmutable::create($dernierJour->year, $dernierJour->month, $dernierJour->day, self::HEURE_RELEVE, 0, 0, $fuseau)->addDay()->utc();
        $ville = (string) Ville::query()->whereKey($villeId)->value('nom');

        $tour = TourGarde::query()->where('ville_id', $villeId)->where('actif', true)->where('debut', $debut)->where('fin', $fin)->first();
        if ($tour !== null && ! $tour->estBrouillon()) {
            return ['ville' => $ville, 'tour' => $tour->id_public, 'etat' => 'deja_publie', 'gardes' => 0];
        }

        $etat = $tour !== null ? 'remplace' : 'cree';
        if ($tour !== null) {
            $tour->gardes()->delete();
        } else {
            $tour = TourGarde::query()->create([
                'ville_id' => $villeId,
                'debut' => $debut,
                'fin' => $fin,
                'statut' => StatutTour::Brouillon,
                'saisi_par' => $auteur?->idInterne(),
            ]);
        }
        foreach ($pharmacies as $pharmacieId) {
            Garde::query()->create(['tour_garde_id' => $tour->id, 'pharmacie_id' => $pharmacieId, 'debut' => $debut, 'fin' => $fin]);
        }

        return ['ville' => $ville, 'tour' => $tour->id_public, 'etat' => $etat, 'gardes' => count($pharmacies)];
    }

    /** « DE L'INDENIE » → « Pharmacie de l'Indenie » ; « ST PIERRE NIMBO » → « Pharmacie St Pierre Nimbo ». */
    public static function nomFiche(string $nom): string
    {
        $petits = ['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux'];
        $mots = array_map(function (string $mot) use ($petits): string {
            if (in_array($mot, $petits, true)) {
                return $mot;
            }
            if (preg_match("/^([ld]')(.+)$/u", $mot, $m) === 1) {
                return $m[1].Str::ucfirst($m[2]);
            }

            return Str::ucfirst($mot);
        }, preg_split('/\s+/u', Str::lower(trim($nom)), -1, PREG_SPLIT_NO_EMPTY) ?: []);

        return Str::limit('Pharmacie '.implode(' ', $mots), 150, '');
    }

    private function indicatif(int $villeId): string
    {
        return (string) Ville::query()->with('pays')->findOrFail($villeId)->pays->indicatif;
    }
}
