<?php

declare(strict_types=1);

use App\Modules\Pharmacies\Models\Pharmacie;
use Database\Seeders\PharmaciesTestSeeder;
use Database\Seeders\TerritoireSeeder;

it('nomme les pharmacies fictives avec le suffixe court « (test) »', function (): void {
    $this->seed([TerritoireSeeder::class, PharmaciesTestSeeder::class]);

    $noms = Pharmacie::query()->where('id_public', 'like', 'ph_test%')->pluck('nom');

    expect($noms)->toHaveCount(20)
        ->and($noms->every(fn (string $nom): bool => str_ends_with($nom, ' (test)')))->toBeTrue()
        ->and($noms)->toContain('Pharmacie Alpha (test)');
});
