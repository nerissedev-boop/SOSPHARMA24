<?php

declare(strict_types=1);

use App\Modules\Pharmacies\Http\Controllers\AdminAssuranceController;
use App\Modules\Pharmacies\Http\Controllers\AdminPharmacieController as Admin;
use App\Modules\Pharmacies\Http\Controllers\AssuranceController;
use App\Modules\Pharmacies\Http\Controllers\EspacePharmacienController;
use App\Modules\Pharmacies\Http\Controllers\MembrePharmacieController;
use App\Modules\Pharmacies\Http\Controllers\PharmacieController;
use Illuminate\Support\Facades\Route;

// Public (app mobile) — les routes nommées passent avant {pharmacie}.
// « appareil.optionnel » (module Notifications) : si X-Device-Token est reconnu, accepte_mes_assurances est calculé.
Route::middleware('appareil.optionnel')->group(function (): void {
    Route::get('pharmacies/proches', [PharmacieController::class, 'proches']);
    Route::get('pharmacies/cadre', [PharmacieController::class, 'cadre']);
    Route::get('pharmacies/recherche', [PharmacieController::class, 'rechercher']);
    Route::get('pharmacies/{pharmacie}', [PharmacieController::class, 'show'])->where('pharmacie', 'ph_[a-z0-9]+');
});
Route::get('villes/{ville}/compteurs', [PharmacieController::class, 'compteurs']);
Route::get('pays/{pays}/assurances', [AssuranceController::class, 'index']);

// « Mes assurances » de l'appareil, sans compte (table appareil_assurances, propriété de ce module).
Route::prefix('appareils/moi')->middleware('appareil')->group(function (): void {
    Route::get('assurances', [AssuranceController::class, 'mesAssurances']);
    Route::put('assurances', [AssuranceController::class, 'remplacerMesAssurances']);
});

// Équipe
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin,editeur_ville'])->group(function (): void {
    Route::post('pharmacies/import', [Admin::class, 'importer'])->middleware('role:admin');
    Route::get('pharmacies', [Admin::class, 'index']);
    Route::post('pharmacies', [Admin::class, 'store']);
    Route::get('pharmacies/{pharmacie}', [Admin::class, 'show']);
    Route::patch('pharmacies/{pharmacie}', [Admin::class, 'update']);
    Route::delete('pharmacies/{pharmacie}', [Admin::class, 'destroy']);
    Route::put('pharmacies/{pharmacie}/horaires', [Admin::class, 'horaires']);
    Route::put('pharmacies/{pharmacie}/assurances', [AdminAssuranceController::class, 'pharmacie']);

    Route::middleware('role:admin')->group(function (): void {
        Route::post('comptes/{compte}/pharmacies', [MembrePharmacieController::class, 'rattacher']);
        Route::delete('comptes/{compte}/pharmacies', [MembrePharmacieController::class, 'detacher']);

        // Référentiel des assurances et propositions d'assurances absentes.
        Route::get('assurances/propositions', [AdminAssuranceController::class, 'propositions']);
        Route::post('assurances/propositions/{proposition}/accepter', [AdminAssuranceController::class, 'accepter']);
        Route::post('assurances/propositions/{proposition}/rejeter', [AdminAssuranceController::class, 'rejeter']);
        Route::get('assurances', [AdminAssuranceController::class, 'index']);
        Route::post('assurances', [AdminAssuranceController::class, 'store']);
        Route::patch('assurances/{assurance}', [AdminAssuranceController::class, 'update']);
        Route::delete('assurances/{assurance}', [AdminAssuranceController::class, 'destroy']);
    });
});

// Espace pharmacien
Route::prefix('pharmacien')->middleware(['auth:sanctum', 'role:pharmacien'])->group(function (): void {
    Route::get('pharmacie', [EspacePharmacienController::class, 'show']);
    Route::patch('pharmacie', [EspacePharmacienController::class, 'update']);
    Route::put('pharmacie/horaires', [EspacePharmacienController::class, 'horaires']);
    Route::put('pharmacie/assurances', [EspacePharmacienController::class, 'assurances']);
});
