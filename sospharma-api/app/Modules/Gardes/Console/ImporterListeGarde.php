<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Console;

use App\Commun\Erreurs\DonneesInvalides;
use App\Modules\Gardes\Services\ImportListeGarde;
use App\Modules\Gardes\Services\PharmacieRapprochee;
use App\Modules\Gardes\Services\RapprochementListeGarde;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class ImporterListeGarde extends Command
{
    protected $signature = 'gardes:importer-liste
        {fichier : Texte de la liste de garde officielle (copié du PDF, par ex. après PDF24)}
        {--simulation : Montre le bilan sans rien écrire}
        {--accepter-a-verifier : Rattache aussi les fiches « à vérifier » sans poser la question}
        {--premier-jour= : AAAA-MM-JJ, si l\'en-tête de la liste ne donne pas la période}
        {--dernier-jour= : AAAA-MM-JJ}';

    protected $description = 'Importe la liste de garde officielle : brouillons de tours par ville, fiches inconnues en « Position à confirmer », numéros manquants complétés.';

    public function handle(RapprochementListeGarde $rapprochement, ImportListeGarde $import): int
    {
        $fichier = (string) $this->argument('fichier');
        if (! is_readable($fichier)) {
            $this->error("Fichier introuvable : {$fichier}");

            return self::FAILURE;
        }
        $texte = (string) file_get_contents($fichier);

        // Les fiches « à vérifier » attendent un oui explicite ; sans réponse possible, elles sont écartées.
        $decisions = [];
        [, $resultats] = $rapprochement->analyser($texte);
        foreach ($resultats as $rang => $r) {
            if ($r->statut !== PharmacieRapprochee::A_VERIFIER || $r->pharmacie === null) {
                continue;
            }
            $oui = $this->option('accepter-a-verifier')
                || ($this->input->isInteractive() && $this->confirm(sprintf('[%s] « %s » est-elle la fiche « %s » ?', $r->entree->section ?? '?', $r->entree->nom, $r->pharmacie->nom)));
            if ($oui) {
                $decisions[$rang] = ['action' => ImportListeGarde::RATTACHER];
            }
        }

        try {
            $bilan = $import->importer(
                $texte,
                $decisions,
                null,
                $this->jour('premier-jour'),
                $this->jour('dernier-jour'),
                (bool) $this->option('simulation'),
            );
        } catch (DonneesInvalides $e) {
            $messages = [];
            $details = $e->details() ?? [];
            array_walk_recursive($details, function (mixed $m) use (&$messages): void {
                $messages[] = (string) $m;
            });
            $this->error($messages !== [] ? implode(' ', $messages) : $e->getMessage());

            return self::FAILURE;
        }

        $this->line(sprintf('Semaine du %s au %s%s.', $bilan['premier_jour'], $bilan['dernier_jour'], $this->option('simulation') ? ' (simulation : rien n\'est écrit)' : ''));
        $etats = ['cree' => 'brouillon créé', 'remplace' => 'brouillon remplacé', 'deja_publie' => 'déjà publié : non modifié'];
        $this->table(['Ville', 'Tour', 'Pharmacies de garde'], array_map(fn (array $t): array => [$t['ville'], $etats[$t['etat']], $t['gardes']], $bilan['tours']));
        $this->table(['Résultat', 'Nombre'], [
            ['Fiches créées (position à confirmer)', $bilan['fiches_creees']],
            ['Numéros ajoutés à des fiches', $bilan['telephones_completes']],
            ['Adresses complétées par le repère', $bilan['adresses_completees']],
            ['Pharmacies écartées', count($bilan['ignorees'])],
        ]);
        foreach ($bilan['ignorees'] as $ignoree) {
            $this->line("  - {$ignoree['nom']} : {$ignoree['raison']}");
        }
        if (! $this->option('simulation') && $bilan['tours'] !== []) {
            $this->line('Brouillons à contrôler puis publier depuis le back-office (ou POST /admin/tours-garde/{id}/publier).');
        }

        return self::SUCCESS;
    }

    private function jour(string $option): ?CarbonImmutable
    {
        $valeur = $this->option($option);

        return is_string($valeur) && $valeur !== '' ? (CarbonImmutable::createFromFormat('!Y-m-d', $valeur) ?: null) : null;
    }
}
