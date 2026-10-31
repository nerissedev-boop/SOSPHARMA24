<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Console;

use App\Modules\Gardes\Services\PharmacieRapprochee;
use App\Modules\Gardes\Services\RapprochementListeGarde;
use Illuminate\Console\Command;

class AnalyserListeGarde extends Command
{
    protected $signature = 'gardes:analyser-liste
        {fichier : Texte de la liste de garde officielle (copié du PDF, par ex. après PDF24)}
        {--json : Résultat complet en JSON}';

    protected $description = 'Lit la liste de garde officielle et retrouve chaque pharmacie dans l\'annuaire, sans rien écrire.';

    private const LIBELLES = [
        PharmacieRapprochee::TROUVEE => 'Trouvée',
        PharmacieRapprochee::A_VERIFIER => 'À vérifier',
        PharmacieRapprochee::INCONNUE => 'Inconnue',
    ];

    private const ALERTES = [
        PharmacieRapprochee::VILLE_INCONNUE => 'ville absente de la base',
        PharmacieRapprochee::AUTRE_VILLE => 'fiche dans une autre ville',
        PharmacieRapprochee::TELEPHONE_CORRIGE => 'numéro corrigé',
        PharmacieRapprochee::TELEPHONE_ILLISIBLE => 'numéro illisible',
        PharmacieRapprochee::SANS_TELEPHONE => 'pas de numéro',
        PharmacieRapprochee::TELEPHONE_A_AJOUTER => 'numéro à ajouter à la fiche',
        PharmacieRapprochee::TELEPHONE_DIFFERENT => 'autre numéro sur la fiche',
    ];

    public function handle(RapprochementListeGarde $rapprochement): int
    {
        $fichier = (string) $this->argument('fichier');
        if (! is_readable($fichier)) {
            $this->error("Fichier introuvable : {$fichier}");

            return self::FAILURE;
        }

        [$liste, $resultats] = $rapprochement->analyser((string) file_get_contents($fichier));

        if ($this->option('json')) {
            $this->line((string) json_encode([
                'premier_jour' => $liste->premierJour?->toDateString(),
                'dernier_jour' => $liste->dernierJour?->toDateString(),
                'pharmacies' => array_map(fn (PharmacieRapprochee $r): array => $r->versTableau(), $resultats),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->line($liste->premierJour !== null
            ? sprintf('Période annoncée : du %s au %s.', $liste->premierJour->format('d/m/Y'), $liste->dernierJour?->format('d/m/Y'))
            : 'Période introuvable dans l\'en-tête : elle sera à saisir.');

        $this->table(['Ville', 'Pharmacie (liste)', 'Résultat', 'Fiche', 'Téléphones', 'Alertes'], array_map(fn (PharmacieRapprochee $r): array => [
            $r->entree->section ?? '?',
            $r->entree->nom,
            self::LIBELLES[$r->statut],
            $r->pharmacie?->nom ?? '',
            implode("\n", array_map(fn (string $n): string => trim(chunk_split($n, 2, ' ')), $r->entree->telephones)),
            implode("\n", array_map(fn (string $a): string => self::ALERTES[$a], $r->alertes)),
        ], $resultats));

        $compte = array_count_values(array_map(fn (PharmacieRapprochee $r): string => $r->statut, $resultats));
        $this->line(sprintf(
            '%d pharmacie(s) lue(s) : %d trouvée(s), %d à vérifier, %d inconnue(s). Rien n\'a été écrit.',
            count($resultats),
            $compte[PharmacieRapprochee::TROUVEE] ?? 0,
            $compte[PharmacieRapprochee::A_VERIFIER] ?? 0,
            $compte[PharmacieRapprochee::INCONNUE] ?? 0,
        ));

        return self::SUCCESS;
    }
}
