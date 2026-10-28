<?php

declare(strict_types=1);

use App\Modules\Territoire\Enums\StatutVille;

it('répond en français à l’app réglée en français', function (): void {
    $reponse = $this->getJson('/api/v1/nexiste-pas', ['Accept-Language' => 'fr-CI,fr;q=0.9'])
        ->assertNotFound()
        ->assertHeader('Content-Language', 'fr');

    expect($reponse->json('error.message'))->toBe('Élément introuvable.');
});

it('répond en français sans en-tête de langue', function (): void {
    $this->withoutHeader('Accept-Language')
        ->withServerVariables(['HTTP_ACCEPT_LANGUAGE' => ''])
        ->getJson('/api/v1/nexiste-pas')
        ->assertHeader('Content-Language', 'fr');
});

it('traduit les messages d’erreur en anglais', function (): void {
    $this->getJson('/api/v1/nexiste-pas', ['Accept-Language' => 'en'])
        ->assertNotFound()
        ->assertHeader('Content-Language', 'en')
        ->assertJsonPath('error.message', 'Item not found.');

    $json = $this->getJson('/api/v1/zones/depuis-position?lat=abc', ['Accept-Language' => 'en-GB,en;q=0.9'])->assertStatus(422)->json();
    expect($json['error']['message'])->toBe('Some information is invalid.')
        ->and($json['error']['details']['lat'][0])->toContain('latitude')
        ->and($json['error']['details']['lat'][0])->not->toContain('champ');
});

it('traduit les messages propres à SOS Pharma 24 dans les détails par champ', function (): void {
    creerAbidjan();

    $json = $this->postJson('/api/v1/support/messages', ['message' => 'Bonjour'], ['Accept-Language' => 'en'])->assertStatus(422)->json();

    expect($json['error']['details']['sujet'][0])->toBe('Choose a subject.')
        ->and($json['error']['details']['message'][0])->toBe('Your message is too short (at least 10 characters).');
});

it('garde le français pour une langue non prise en charge', function (): void {
    $this->getJson('/api/v1/nexiste-pas', ['Accept-Language' => 'es'])
        ->assertHeader('Content-Language', 'fr')
        ->assertJsonPath('error.message', 'Élément introuvable.');
});

it('donne le résumé du pays dans la langue demandée, avec un seul cache', function (): void {
    $abidjan = creerAbidjan();
    creerVille($abidjan->pays, 'Bouaké', StatutVille::Bientot, 'vi_bke');

    $this->getJson('/api/v1/pays')->assertJsonPath('data.0.resume', 'Abidjan ouvert, autres villes bientôt');
    $this->getJson('/api/v1/pays', ['Accept-Language' => 'en'])->assertJsonPath('data.0.resume', 'Abidjan open, other cities coming soon');
    $this->getJson('/api/v1/pays', ['Accept-Language' => 'fr'])->assertJsonPath('data.0.resume', 'Abidjan ouvert, autres villes bientôt');
});
