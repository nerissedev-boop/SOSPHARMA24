<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();

        // Garde-fou : RefreshDatabase vide la base à chaque test. Une configuration en cache
        // (php artisan optimize) fait ignorer la base SQLite en mémoire de phpunit.xml : les
        // tests videraient alors la vraie base MySQL. Le 31 oct. 2026, c'est arrivé.
        $connexion = (string) $app['config']->get('database.default');
        $base = (string) $app['config']->get("database.connections.{$connexion}.database");
        if ($connexion !== 'sqlite' || $base !== ':memory:') {
            throw new RuntimeException(
                "Tests arrêtés : ils visent la base « {$connexion}:{$base} » au lieu de SQLite en mémoire. "
                .'Lancez « php artisan optimize:clear » puis relancez les tests.'
            );
        }

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Comme l'app, qui envoie toujours sa langue (sinon Symfony simule « en-us »).
        $this->withHeader('Accept-Language', 'fr');
    }
}
