<?php

declare(strict_types=1);

use App\Modules\Comptes\ComptesServiceProvider;
use App\Modules\Gardes\GardesServiceProvider;
use App\Modules\Notifications\NotificationsServiceProvider;
use App\Modules\Pharmacies\PharmaciesServiceProvider;
use App\Modules\Releves\RelevesServiceProvider;
use App\Modules\Signalements\SignalementsServiceProvider;
use App\Modules\Support\SupportServiceProvider;
use App\Modules\Territoire\TerritoireServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    // Ordre = sens des dépendances : Territoire et Comptes d'abord.
    TerritoireServiceProvider::class,
    ComptesServiceProvider::class,
    PharmaciesServiceProvider::class,
    GardesServiceProvider::class,
    SignalementsServiceProvider::class,
    SupportServiceProvider::class,
    NotificationsServiceProvider::class,
    RelevesServiceProvider::class,
];
