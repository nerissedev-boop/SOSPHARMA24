<?php

declare(strict_types=1);

/*
| Sens des dépendances entre modules (document d'architecture, « Découpage en modules ») :
|   Territoire ← Pharmacies ← Gardes, Signalements ; Comptes et Support ne dépendent d'aucun module ;
|   Notifications réagit aux événements TourGardePublie (Gardes) et PropositionTraitee (Relevés)
|   sans que ces modules le connaissent ;
|   Relevés dépend de Territoire et de Pharmacies, mais de Pharmacies seulement par son contrat
|   (App\Modules\Pharmacies\Contrats) ; aucun module ne dépend de Relevés, hormis ses événements.
| Tout le monde peut utiliser App\Commun ; App\Commun n'importe aucun module.
*/

arch('Commun n\'importe aucun module')
    ->expect('App\Commun')
    ->not->toUse('App\Modules');

arch('Territoire ne dépend d\'aucun autre module')
    ->expect('App\Modules\Territoire')
    ->not->toUse(['App\Modules\Pharmacies', 'App\Modules\Gardes', 'App\Modules\Signalements', 'App\Modules\Support', 'App\Modules\Notifications', 'App\Modules\Comptes', 'App\Modules\Releves']);

arch('Comptes ne dépend d\'aucun module')
    ->expect('App\Modules\Comptes')
    ->not->toUse(['App\Modules\Territoire', 'App\Modules\Pharmacies', 'App\Modules\Gardes', 'App\Modules\Signalements', 'App\Modules\Support', 'App\Modules\Notifications', 'App\Modules\Releves']);

arch('Support ne dépend d\'aucun module')
    ->expect('App\Modules\Support')
    ->not->toUse(['App\Modules\Territoire', 'App\Modules\Pharmacies', 'App\Modules\Gardes', 'App\Modules\Signalements', 'App\Modules\Notifications', 'App\Modules\Comptes', 'App\Modules\Releves']);

arch('Pharmacies ne dépend que de Territoire et Comptes')
    ->expect('App\Modules\Pharmacies')
    ->not->toUse(['App\Modules\Gardes', 'App\Modules\Signalements', 'App\Modules\Support', 'App\Modules\Notifications', 'App\Modules\Releves']);

arch('Gardes ne connaît ni Notifications ni Signalements ni Support')
    ->expect('App\Modules\Gardes')
    ->not->toUse(['App\Modules\Notifications', 'App\Modules\Signalements', 'App\Modules\Support', 'App\Modules\Releves']);

arch('Signalements ne dépend que de Territoire, Pharmacies et Comptes')
    ->expect('App\Modules\Signalements')
    ->not->toUse(['App\Modules\Gardes', 'App\Modules\Support', 'App\Modules\Notifications', 'App\Modules\Releves']);

arch('Notifications ne voit de Gardes et de Relevés que leurs événements')
    ->expect('App\Modules\Notifications')
    ->not->toUse(['App\Modules\Gardes', 'App\Modules\Signalements', 'App\Modules\Support', 'App\Modules\Comptes', 'App\Modules\Releves'])
    ->ignoring(['App\Modules\Gardes\Events', 'App\Modules\Releves\Events']);

arch('Relevés ne dépend que de Territoire, Comptes et du contrat de Pharmacies')
    ->expect('App\Modules\Releves')
    ->not->toUse([
        'App\Modules\Gardes', 'App\Modules\Signalements', 'App\Modules\Support', 'App\Modules\Notifications',
        // Pharmacies : ni modèles, ni services, ni contrôleurs, ni tables ; seulement App\Modules\Pharmacies\Contrats.
        'App\Modules\Pharmacies\Models', 'App\Modules\Pharmacies\Services', 'App\Modules\Pharmacies\Http',
        'App\Modules\Pharmacies\Policies', 'App\Modules\Pharmacies\Enums', 'App\Modules\Pharmacies\Exceptions',
    ]);

arch('Relevés utilise Pharmacies par son contrat')
    ->expect('App\Modules\Releves\Services\ValidationReleves')
    ->toUse('App\Modules\Pharmacies\Contrats\EditionFichesPharmacies');

arch('aucun module n\'utilise les contrôleurs d\'un autre module')
    ->expect(['App\Modules\Gardes', 'App\Modules\Signalements', 'App\Modules\Notifications', 'App\Modules\Releves'])
    ->not->toUse(['App\Modules\Pharmacies\Http\Controllers', 'App\Modules\Territoire\Http\Controllers']);

arch('le code applicatif est typé strictement')
    ->expect('App')
    ->toUseStrictTypes();

arch('pas de fonctions de débogage oubliées')
    ->expect(['dd', 'dump', 'ray', 'var_dump', 'print_r'])
    ->not->toBeUsed();
