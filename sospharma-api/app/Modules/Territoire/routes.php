<?php

declare(strict_types=1);

use App\Modules\Territoire\Http\Controllers\AdminTerritoireController as Admin;
use App\Modules\Territoire\Http\Controllers\TerritoireController;
use Illuminate\Support\Facades\Route;

// Public (app mobile)
Route::get('pays', [TerritoireController::class, 'pays']);
Route::get('pays/{pays}/villes', [TerritoireController::class, 'villes']);
Route::get('villes/{ville}/zones', [TerritoireController::class, 'zones']);
Route::get('zones/depuis-position', [TerritoireController::class, 'depuisPosition']);

// Équipe
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin,editeur_ville'])->group(function (): void {
    Route::middleware('role:admin')->group(function (): void {
        Route::get('pays', [Admin::class, 'listerPays']);
        Route::post('pays', [Admin::class, 'creerPays']);
        Route::patch('pays/{pays}', [Admin::class, 'modifierPays']);
        Route::delete('pays/{pays}', [Admin::class, 'desactiverPays']);

        Route::get('villes', [Admin::class, 'listerVilles']);
        Route::post('villes', [Admin::class, 'creerVille']);
        Route::patch('villes/{ville}', [Admin::class, 'modifierVille']);
        Route::delete('villes/{ville}', [Admin::class, 'desactiverVille']);

        Route::post('zones/import', [Admin::class, 'importerZones']);
    });

    Route::get('zones', [Admin::class, 'listerZones']);
    Route::post('zones', [Admin::class, 'creerZone']);
    Route::patch('zones/{zone}', [Admin::class, 'modifierZone']);
    Route::delete('zones/{zone}', [Admin::class, 'desactiverZone']);
});
