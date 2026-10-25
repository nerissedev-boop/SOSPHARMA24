<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Console;

use App\Modules\Notifications\Models\EnvoiNotification;
use App\Modules\Notifications\Services\EnvoiNotificationsGarde;
use Illuminate\Console\Command;

class EnvoyerNotificationsGarde extends Command
{
    protected $signature = 'notifications:garde-samedi {--maintenant : Envoie aussi les notifications pas encore à échéance}';

    protected $description = 'Envoie la notification « nouveau tour de garde » (samedi matin, par lots de 100 vers Expo Push).';

    public function handle(EnvoiNotificationsGarde $envoi): int
    {
        $traites = $envoi->envoyerEnAttente((bool) $this->option('maintenant'));

        if ($traites === []) {
            $this->info('Aucune notification à envoyer.');

            return self::SUCCESS;
        }

        foreach ($traites as $e) {
            $this->line(sprintf('%s : %s, %d destinataire(s), %d échec(s)%s', $e->id_public, $e->statut, $e->destinataires, $e->echecs,
                $e->derniere_erreur !== null ? ' — '.$e->derniere_erreur : ''));
        }

        $enEchec = array_filter($traites, fn (EnvoiNotification $e): bool => $e->statut === EnvoiNotification::ECHEC);

        return $enEchec === [] ? self::SUCCESS : self::FAILURE;
    }
}
