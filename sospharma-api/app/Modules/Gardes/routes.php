<?php

declare(strict_types=1);

use App\Modules\Gardes\Http\Controllers\AdminTourGardeController as Admin;
use App\Modules\Gardes\Http\Controllers\GardePubliqueController;
use App\Modules\Gardes\Http\Controllers\PharmacienGardeController;
use Illuminate\Support\Facades\Route;

// « appareil.optionnel » : accepte_mes_assurances calculé si l'appareil est reconnu.
Route::get('gardes/en-cours', [GardePubliqueController::class, 'enCours'])->middleware('appareil.optionnel');

Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin,editeur_ville'])->group(function (): void {
    Route::post('tours-garde/import', [Admin::class, 'importer']);
    Route::get('tours-garde', [Admin::class, 'index']);
    Route::post('tours-garde', [Admin::class, 'store']);
    Route::get('tours-garde/{tour}', [Admin::class, 'show']);
    Route::patch('tours-garde/{tour}', [Admin::class, 'update']);
    Route::delete('tours-garde/{tour}', [Admin::class, 'destroy']);
    Route::post('tours-garde/{tour}/controler', [Admin::class, 'controler']);
    Route::post('tours-garde/{tour}/publier', [Admin::class, 'publier']);
    Route::post('tours-garde/{tour}/gardes', [Admin::class, 'ajouterGarde']);
    Route::delete('tours-garde/{tour}/gardes', [Admin::class, 'retirerGarde']);
});

Route::prefix('pharmacien')->middleware(['auth:sanctum', 'role:pharmacien'])->group(function (): void {
    Route::get('gardes', [PharmacienGardeController::class, 'index']);
    Route::post('gardes/{garde}/confirmer', [PharmacienGardeController::class, 'confirmer']);
});
