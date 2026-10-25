<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

/*
| Planification : une seule tâche cron sur o2switch lance `php artisan schedule:run` chaque minute,
| Laravel décide ensuite quoi exécuter.
*/

// Notification « nouveau tour de garde » : le samedi matin. Chaque envoi est programmé à 08:00 heure
// locale de sa ville ; passer toutes les 15 minutes couvre les fuseaux et les nouveaux essais après une panne d'Expo.
Schedule::command('notifications:garde-samedi')
    ->saturdays()
    ->everyFifteenMinutes()
    ->between('05:00', '13:00')
    ->withoutOverlapping()
    ->onOneServer();

// Sauvegarde quotidienne de la base (à copier ensuite hors du serveur).
Schedule::command('sauvegarde:base')->dailyAt('02:30')->withoutOverlapping();

// Ménage : jetons Sanctum expirés.
Schedule::command('sanctum:prune-expired --hours=24')->daily();
