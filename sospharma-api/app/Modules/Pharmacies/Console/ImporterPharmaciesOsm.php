<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Console;

use App\Modules\Pharmacies\Services\ImportPharmaciesOsm;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Throwable;

class ImporterPharmaciesOsm extends Command
{
    protected $signature = 'pharmacies:importer-osm
        {fichier? : Réponse JSON d\'Overpass (out tags center) ; téléchargée si absente}
        {--pays=CI : Code ISO du pays à télécharger}
        {--desactiver-test : Retire aussi des listes les pharmacies fictives du jeu de test (ph_test…)}
        {--simulation : Compte ce qui serait fait, sans rien écrire}';

    protected $description = 'Importe les pharmacies d\'OpenStreetMap (© les contributeurs d\'OpenStreetMap, ODbL) comme fiches à vérifier.';

    private const OVERPASS = 'https://overpass-api.de/api/interpreter';

    public function handle(ImportPharmaciesOsm $import): int
    {
        try {
            $elements = $this->elements();
        } catch (Throwable $e) {
            $this->error('Lecture des données OpenStreetMap impossible : '.$e->getMessage());

            return self::FAILURE;
        }

        $simulation = (bool) $this->option('simulation');
        $bilan = $import->importer($elements, $simulation);
        $desactivees = $this->option('desactiver-test') ? $import->desactiverDonneesTest($simulation) : null;

        $this->line(sprintf('%d élément(s) OpenStreetMap lu(s)%s.', count($elements), $simulation ? ' (simulation : rien n\'est écrit)' : ''));
        $this->table(['Résultat', 'Nombre'], [
            ['Fiches créées (à vérifier)', $bilan['creees']],
            ['Fiches importées mises à jour', $bilan['mises_a_jour']],
            ['Fiches existantes rattachées', $bilan['rattachees']],
            ['Fiches vérifiées laissées telles quelles', $bilan['verifiees_intactes']],
            ['Ignorées : sans nom', $bilan['sans_nom']],
            ['Ignorées : hors des communes connues', $bilan['hors_zone']],
            ...($desactivees !== null ? [['Pharmacies de test retirées des listes', $desactivees]] : []),
        ]);

        return self::SUCCESS;
    }

    /** @return list<array<string, mixed>> */
    private function elements(): array
    {
        $fichier = $this->argument('fichier');
        if (is_string($fichier) && $fichier !== '') {
            if (! is_readable($fichier)) {
                throw new \RuntimeException("fichier introuvable : {$fichier}");
            }
            $json = (string) file_get_contents($fichier);
        } else {
            $pays = strtoupper((string) $this->option('pays'));
            if (preg_match('/^[A-Z]{2}$/', $pays) !== 1) {
                throw new \RuntimeException('code pays invalide (deux lettres attendues, ex. CI)');
            }
            $this->line("Téléchargement des pharmacies OpenStreetMap ({$pays})…");
            $json = Http::withUserAgent('SOSPharma24-import/1.0')
                ->accept('application/json')
                ->timeout(180)
                ->asForm()
                ->post(self::OVERPASS, ['data' => "[out:json][timeout:150];area[\"ISO3166-1\"=\"{$pays}\"]->.a;nwr[\"amenity\"=\"pharmacy\"](area.a);out tags center;"])
                ->throw()
                ->body();
        }

        $donnees = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        if (! is_array($donnees) || ! isset($donnees['elements']) || ! is_array($donnees['elements'])) {
            throw new \RuntimeException('réponse Overpass inattendue (clé « elements » absente)');
        }

        return array_values($donnees['elements']);
    }
}
