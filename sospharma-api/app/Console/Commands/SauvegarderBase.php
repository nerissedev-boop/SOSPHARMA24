<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;
use Throwable;

/**
 * Export quotidien de la base MySQL/MariaDB (mysqldump, compressé) dans storage/app/private/sauvegardes.
 * Les fichiers doivent ensuite être copiés hors du serveur (voir README).
 */
class SauvegarderBase extends Command
{
    protected $signature = 'sauvegarde:base';

    protected $description = 'Exporte la base de données (mysqldump compressé) et supprime les anciennes sauvegardes.';

    public function handle(): int
    {
        $connexion = (string) config('database.default');
        $config = (array) config("database.connections.{$connexion}");
        if (! in_array($config['driver'] ?? null, ['mysql', 'mariadb'], true)) {
            $this->error("La sauvegarde ne gère que MySQL/MariaDB (connexion actuelle : {$connexion}).");

            return self::FAILURE;
        }

        $dossier = (string) config('sospharma.sauvegarde.dossier');
        $sql = $dossier.'/sospharma-'.now()->format('Ymd-His').'.sql';

        try {
            File::ensureDirectoryExists($dossier, 0750);

            $resultat = Process::timeout(600)
                // Le mot de passe passe par l'environnement, jamais par la ligne de commande visible.
                ->env(['MYSQL_PWD' => (string) ($config['password'] ?? '')])
                ->run([
                    (string) config('sospharma.sauvegarde.mysqldump', 'mysqldump'),
                    '--host='.($config['host'] ?? '127.0.0.1'),
                    '--port='.($config['port'] ?? '3306'),
                    '--user='.($config['username'] ?? ''),
                    '--single-transaction',
                    '--quick',
                    '--routines',
                    '--no-tablespaces',
                    '--default-character-set=utf8mb4',
                    '--result-file='.$sql,
                    (string) ($config['database'] ?? ''),
                ]);

            if ($resultat->failed()) {
                throw new RuntimeException('mysqldump a échoué : '.trim($resultat->errorOutput()));
            }

            $archive = $this->compresser($sql);
        } catch (Throwable $e) {
            Log::error('Sauvegarde de la base échouée', ['erreur' => $e->getMessage()]);
            File::delete($sql);
            $this->error('Sauvegarde échouée : '.$e->getMessage());

            return self::FAILURE;
        }

        $supprimees = $this->nettoyer($dossier, (int) config('sospharma.sauvegarde.jours_conserves', 14));
        Log::info('Sauvegarde de la base terminée', ['fichier' => basename($archive), 'anciennes_supprimees' => $supprimees]);
        $this->info("Sauvegarde : {$archive}");

        return self::SUCCESS;
    }

    private function compresser(string $sql): string
    {
        $archive = $sql.'.gz';
        $entree = fopen($sql, 'rb');
        $sortie = gzopen($archive, 'wb6');
        if ($entree === false || $sortie === false) {
            throw new RuntimeException('Impossible de compresser la sauvegarde.');
        }
        try {
            while (! feof($entree)) {
                gzwrite($sortie, (string) fread($entree, 1024 * 512));
            }
        } finally {
            fclose($entree);
            gzclose($sortie);
        }
        File::delete($sql);

        return $archive;
    }

    private function nettoyer(string $dossier, int $jours): int
    {
        $limite = now()->subDays($jours)->getTimestamp();
        $supprimees = 0;
        foreach (File::glob($dossier.'/sospharma-*.sql.gz') as $fichier) {
            if (File::lastModified($fichier) < $limite && File::delete($fichier)) {
                $supprimees++;
            }
        }

        return $supprimees;
    }
}
