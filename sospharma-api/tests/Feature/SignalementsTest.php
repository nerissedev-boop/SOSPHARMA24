<?php

declare(strict_types=1);

it('limite les signalements à 5 par jour et par appareil', function (): void {
    $pharmacie = creerPharmacie(creerAbidjan());
    $url = "/api/v1/pharmacies/{$pharmacie->id_public}/signalements";

    foreach (range(1, 5) as $_) {
        $this->postJson($url, ['motif' => 'fermee'], ['X-Device-Token' => 'appareil-de-test'])->assertCreated();
    }

    $this->postJson($url, ['motif' => 'fermee'], ['X-Device-Token' => 'appareil-de-test'])
        ->assertStatus(429)
        ->assertJsonPath('error.code', 'TOO_MANY_REQUESTS')
        ->assertJsonPath('success', false);
});

it('exige un motif et des précisions pour « autre »', function (): void {
    $pharmacie = creerPharmacie(creerAbidjan());

    $this->postJson("/api/v1/pharmacies/{$pharmacie->id_public}/signalements", [])
        ->assertStatus(422)->assertJsonPath('error.details.motif.0', 'Choisissez un motif de signalement.');
    $this->postJson("/api/v1/pharmacies/{$pharmacie->id_public}/signalements", ['motif' => 'autre'])
        ->assertStatus(422)->assertJsonPath('error.details.precisions.0', 'Précisez le problème rencontré.');
});
