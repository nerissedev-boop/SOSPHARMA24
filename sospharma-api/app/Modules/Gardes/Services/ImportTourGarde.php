<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\CompteAvecRole;
use App\Commun\Support\LecteurCsv;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Services\ConfigurationPays;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Import CSV d'un tour en brouillon. Colonnes : pharmacie;debut;fin
 *  - pharmacie : identifiant public (ph_…) ;
 *  - debut, fin : facultatives, « AAAA-MM-JJ HH:MM » en heure locale de la ville
 *    (ou ISO 8601 avec fuseau) ; vides = période du tour.
 * Toutes les lignes sont vérifiées ; la moindre erreur annule l'import (erreurs ligne par ligne dans error.details).
 */
final class ImportTourGarde
{
    public function __construct(
        private readonly GestionToursGarde $gestion,
        private readonly ConfigurationPays $configuration,
    ) {}

    /** @param array{ville: string, secteur?: string|null, debut: string, fin: string} $periode */
    public function importer(array $periode, UploadedFile $fichier, CompteAvecRole $auteur): TourGarde
    {
        $ville = Ville::query()->where('id_public', $periode['ville'])->firstOrFail();
        $fuseau = $this->configuration->fuseauDeVille($ville->id);
        $lignes = LecteurCsv::lire($fichier, ['pharmacie']);

        $pharmacies = Pharmacie::query()
            ->whereIn('id_public', array_map(fn (array $l): string => $l['valeurs']['pharmacie'], $lignes))
            ->get(['id', 'id_public', 'nom', 'ville_id', 'actif'])
            ->keyBy('id_public');

        $debutTour = CarbonImmutable::parse($periode['debut'], 'UTC')->utc();
        $finTour = CarbonImmutable::parse($periode['fin'], 'UTC')->utc();

        $erreurs = [];
        $gardes = [];
        $dejaVues = [];
        foreach ($lignes as ['ligne' => $numero, 'valeurs' => $v]) {
            $messages = [];
            $pharmacie = $pharmacies[$v['pharmacie']] ?? null;
            if ($pharmacie === null) {
                $messages[] = "Pharmacie inconnue : « {$v['pharmacie']} ».";
            } elseif (! $pharmacie->actif) {
                $messages[] = "{$pharmacie->nom} est désactivée.";
            } elseif ($pharmacie->ville_id !== $ville->id) {
                $messages[] = "{$pharmacie->nom} n'est pas à {$ville->nom}.";
            }

            $debut = $this->date($v['debut'] ?? '', $fuseau, $debutTour, $messages, 'début');
            $fin = $this->date($v['fin'] ?? '', $fuseau, $finTour, $messages, 'fin');
            if ($debut !== null && $fin !== null) {
                if (! $debut->lessThan($fin)) {
                    $messages[] = 'La fin doit être après le début.';
                } elseif ($debut->lessThan($debutTour) || $fin->greaterThan($finTour)) {
                    $messages[] = 'La garde sort de la période du tour.';
                }
            }
            if ($pharmacie !== null && $debut !== null) {
                $cle = $pharmacie->id.'|'.$debut->getTimestamp();
                if (isset($dejaVues[$cle])) {
                    $messages[] = "Doublon de la ligne {$dejaVues[$cle]}.";
                }
                $dejaVues[$cle] = $numero;
            }

            if ($messages !== []) {
                $erreurs['ligne_'.$numero] = $messages;

                continue;
            }
            $gardes[] = ['pharmacie_id' => $pharmacie->id, 'debut' => $debut, 'fin' => $fin];
        }

        if ($erreurs !== []) {
            throw new DonneesInvalides('Le fichier contient '.count($erreurs).' ligne(s) en erreur : aucun brouillon n\'a été créé.', $erreurs);
        }

        try {
            return DB::transaction(function () use ($periode, $auteur, $gardes): TourGarde {
                $tour = $this->gestion->creer($periode, $auteur);
                foreach ($gardes as $garde) {
                    Garde::query()->create($garde + ['tour_garde_id' => $tour->id]);
                }

                return $tour;
            });
        } catch (Throwable $e) {
            Log::error('Import du tour de garde annulé', ['ville' => $ville->id_public, 'erreur' => $e->getMessage()]);

            throw $e;
        }
    }

    /** @param list<string> $messages */
    private function date(string $valeur, string $fuseau, CarbonImmutable $defaut, array &$messages, string $nom): ?CarbonImmutable
    {
        $valeur = trim($valeur);
        if ($valeur === '') {
            return $defaut;
        }
        try {
            // Sans fuseau explicite, la date est lue en heure locale de la ville.
            $date = preg_match('/(Z|[+-]\d{2}:?\d{2})$/', $valeur) === 1
                ? CarbonImmutable::parse($valeur)
                : CarbonImmutable::createFromFormat('Y-m-d H:i', $valeur, $fuseau);
        } catch (Throwable) {
            $date = null;
        }
        // createFromFormat accepte des débordements (mois 13…) : on exige un aller-retour exact.
        if ($date instanceof CarbonImmutable && preg_match('/(Z|[+-]\d{2}:?\d{2})$/', $valeur) !== 1 && $date->format('Y-m-d H:i') !== $valeur) {
            $date = null;
        }
        if (! $date instanceof CarbonImmutable) {
            // Erreur traitée : remontée dans le rapport de la ligne.
            $messages[] = "Date de {$nom} invalide : « {$valeur} » (format AAAA-MM-JJ HH:MM).";

            return null;
        }

        return $date->utc();
    }
}
