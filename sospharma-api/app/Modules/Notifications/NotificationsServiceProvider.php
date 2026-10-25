<?php

declare(strict_types=1);

namespace App\Modules\Notifications;

use App\Commun\FournisseurModule;
use App\Modules\Gardes\Events\TourGardePublie;
use App\Modules\Notifications\Console\EnvoyerNotificationsGarde;
use App\Modules\Notifications\Http\Middleware\IdentifierAppareil;
use App\Modules\Notifications\Http\Middleware\IdentifierAppareilOptionnel;
use App\Modules\Notifications\Listeners\NotifierPropositionTraitee;
use App\Modules\Notifications\Listeners\ProgrammerNotificationGarde;
use App\Modules\Releves\Events\PropositionTraitee;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;

class NotificationsServiceProvider extends FournisseurModule
{
    protected function demarrer(): void
    {
        /** @var Router $router */
        $router = $this->app->make('router');
        $router->aliasMiddleware('appareil', IdentifierAppareil::class);
        $router->aliasMiddleware('appareil.optionnel', IdentifierAppareilOptionnel::class);

        // Gardes ne connaît pas Notifications : on écoute son événement.
        Event::listen(TourGardePublie::class, ProgrammerNotificationGarde::class);
        // Relevés ne connaît pas Notifications : l'usager qui a proposé une pharmacie est prévenu par événement.
        Event::listen(PropositionTraitee::class, NotifierPropositionTraitee::class);

        RateLimiter::for('appareils', fn (Request $request): Limit => Limit::perHour(20)->by('appareils|'.$request->ip()));

        if ($this->app->runningInConsole()) {
            $this->commands([EnvoyerNotificationsGarde::class]);
        }
    }
}
