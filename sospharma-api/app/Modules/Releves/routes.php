<?php

declare(strict_types=1);

use App\Modules\Releves\Http\Controllers\AdminReleveController as Admin;
use App\Modules\Releves\Http\Controllers\AgentReleveController as Agent;
use App\Modules\Releves\Http\Controllers\PropositionController as Proposition;
use Illuminate\Support\Facades\Route;

// Propositions des usagers, sans compte : l'appareil (X-Device-Token) est obligatoire.
// 3 propositions par jour et par appareil, 10 par adresse IP.
Route::prefix('propositions')->middleware('appareil')->group(function (): void {
    Route::get('/', [Proposition::class, 'index']);
    Route::post('/', [Proposition::class, 'store'])->middleware('throttle:propositions');
    Route::post('{releve}/photo', [Proposition::class, 'photo'])->middleware('throttle:propositions-photos');
});

// Espace agent (app mobile, jeton Sanctum gardé dans expo-secure-store).
Route::prefix('agent')->middleware(['auth:sanctum', 'role:agent_terrain'])->group(function (): void {
    Route::get('pharmacies/proches', [Agent::class, 'proches']);
    // 200 relevés par jour et par agent au plus.
    Route::post('releves', [Agent::class, 'store'])->middleware('throttle:releves');
    Route::get('releves', [Agent::class, 'index']);
    Route::patch('releves/{releve}', [Agent::class, 'update']);
    Route::post('releves/{releve}/photos', [Agent::class, 'photo'])->middleware('throttle:releves-photos');
});

// File de validation (équipe : admin partout, éditeur dans sa ville).
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin,editeur_ville'])->group(function (): void {
    Route::get('releves', [Admin::class, 'index']);
    Route::get('releves/{releve}', [Admin::class, 'show']);
    Route::get('releves/{releve}/photos/{photo}', [Admin::class, 'photo']);
    Route::post('releves/{releve}/valider', [Admin::class, 'valider']);
    Route::post('releves/{releve}/a-corriger', [Admin::class, 'aCorriger']);
    Route::post('releves/{releve}/rejeter', [Admin::class, 'rejeter']);
});
