<?php

declare(strict_types=1);

use App\Modules\Signalements\Http\Controllers\SignalementController;
use Illuminate\Support\Facades\Route;

// Public, limité à 5 par jour et par appareil (ou par adresse IP sans appareil).
Route::post('pharmacies/{pharmacie}/signalements', [SignalementController::class, 'store'])
    ->middleware(['appareil.optionnel', 'throttle:signalements']);

Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin,editeur_ville'])->group(function (): void {
    Route::get('signalements', [SignalementController::class, 'index']);
    Route::get('signalements/historique', [SignalementController::class, 'historique']);
    Route::get('signalements/{signalement}', [SignalementController::class, 'show']);
    Route::post('signalements/{signalement}/traiter', [SignalementController::class, 'traiter']);
    Route::post('signalements/{signalement}/rejeter', [SignalementController::class, 'rejeter']);
});
