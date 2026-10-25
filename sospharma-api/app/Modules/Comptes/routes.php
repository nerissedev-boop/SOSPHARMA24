<?php

declare(strict_types=1);

use App\Modules\Comptes\Http\Controllers\AdminCompteController;
use App\Modules\Comptes\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('connexion', [AuthController::class, 'connexion'])->middleware('throttle:connexion');
    Route::post('mot-de-passe/oubli', [AuthController::class, 'oubli'])->middleware('throttle:connexion');
    Route::post('mot-de-passe/reinitialiser', [AuthController::class, 'reinitialiser'])->middleware('throttle:connexion');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('deconnexion', [AuthController::class, 'deconnexion']);
        Route::get('moi', [AuthController::class, 'moi']);
    });
});

Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function (): void {
    Route::get('comptes', [AdminCompteController::class, 'index']);
    Route::post('comptes', [AdminCompteController::class, 'store']);
    Route::patch('comptes/{compte}', [AdminCompteController::class, 'update']);
    Route::delete('comptes/{compte}', [AdminCompteController::class, 'destroy']);
});
