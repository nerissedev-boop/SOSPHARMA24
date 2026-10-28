<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Comme l'app, qui envoie toujours sa langue (sinon Symfony simule « en-us »).
        $this->withHeader('Accept-Language', 'fr');
    }
}
