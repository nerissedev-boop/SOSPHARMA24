<?php

declare(strict_types=1);

use App\Modules\Notifications\Http\Controllers\AdminNotificationController;
use App\Modules\Notifications\Http\Controllers\AppareilController;
use Illuminate\Support\Facades\Route;

Route::post('appareils', [AppareilController::class, 'store'])->middleware('throttle:appareils');

Route::prefix('appareils/moi')->middleware('appareil')->group(function (): void {
    Route::patch('/', [AppareilController::class, 'update']);
    Route::delete('/', [AppareilController::class, 'destroy']);
    Route::get('favoris', [AppareilController::class, 'favoris']);
    Route::post('favoris', [AppareilController::class, 'ajouterFavori']);
    Route::delete('favoris/{pharmacie}', [AppareilController::class, 'retirerFavori']);
});

Route::prefix('admin/notifications')->middleware(['auth:sanctum', 'role:admin,editeur_ville'])->group(function (): void {
    Route::get('envois', [AdminNotificationController::class, 'envois']);
    Route::post('test', [AdminNotificationController::class, 'test'])->middleware('role:admin');
});
