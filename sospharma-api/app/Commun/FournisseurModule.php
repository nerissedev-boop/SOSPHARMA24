<?php

declare(strict_types=1);

namespace App\Commun;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use ReflectionClass;

/**
 * Base des fournisseurs de service des modules : charge routes.php (préfixe /api/v1, groupe « api »)
 * et database/migrations du dossier du module.
 */
abstract class FournisseurModule extends ServiceProvider
{
    public const PREFIXE_API = 'api/v1';

    public function boot(): void
    {
        $dossier = $this->dossierModule();

        if (is_dir($dossier.'/database/migrations')) {
            $this->loadMigrationsFrom($dossier.'/database/migrations');
        }

        if (is_file($dossier.'/routes.php') && ! $this->app->routesAreCached()) {
            Route::prefix(self::PREFIXE_API)
                ->middleware('api')
                ->group($dossier.'/routes.php');
        }

        $this->demarrer();
    }

    /** Point d'extension des modules (policies, écouteurs, limiteurs…). */
    protected function demarrer(): void {}

    protected function dossierModule(): string
    {
        return dirname((string) (new ReflectionClass(static::class))->getFileName());
    }
}
