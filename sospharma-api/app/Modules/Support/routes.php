<?php

declare(strict_types=1);

use App\Modules\Support\Http\Controllers\SupportController;
use Illuminate\Support\Facades\Route;

// Public, limité par appareil.
Route::post('support/messages', [SupportController::class, 'store'])->middleware(['appareil.optionnel', 'throttle:messages-support']);
Route::post('support/messages/{message}/capture', [SupportController::class, 'capture'])->middleware(['appareil', 'throttle:messages-support']);

Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin,editeur_ville'])->group(function (): void {
    Route::get('support/messages', [SupportController::class, 'index']);
    Route::get('support/messages/{message}', [SupportController::class, 'show']);
    Route::get('support/messages/{message}/capture', [SupportController::class, 'telechargerCapture']);
    Route::post('support/messages/{message}/traiter', [SupportController::class, 'traiter']);
});
