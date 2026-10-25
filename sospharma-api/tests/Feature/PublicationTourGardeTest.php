<?php

declare(strict_types=1);

use App\Commun\Securite\Role;
use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Events\TourGardePublie;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Notifications\Models\EnvoiNotification;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->travelTo(now()->parse('2026-10-21T10:00:00Z')); // mercredi
    $this->ville = creerAbidjan();
    $this->pharmacie = creerPharmacie($this->ville, ['zone_id' => $this->ville->zones()->where('nom', 'Cocody')->value('id')]);
    $this->editeur = creerCompte(Role::EditeurVille, $this->ville);
    Sanctum::actingAs($this->editeur);
});

function brouillon(int $villeId, string $debut, string $fin, ?int $pharmacieId = null): TourGarde
{
    $tour = TourGarde::query()->create(['ville_id' => $villeId, 'debut' => $debut, 'fin' => $fin, 'statut' => StatutTour::Brouillon]);
    if ($pharmacieId !== null) {
        $tour->gardes()->create(['pharmacie_id' => $pharmacieId, 'debut' => $debut, 'fin' => $fin]);
    }

    return $tour;
}

it('refuse en CONFLICT un tour qui chevauche un tour publié', function (): void {
    $publie = brouillon($this->ville->id, '2026-10-24 08:00:00', '2026-10-31 08:00:00', $this->pharmacie->id);
    $publie->update(['statut' => StatutTour::Publie]);
    $nouveau = brouillon($this->ville->id, '2026-10-30 08:00:00', '2026-11-06 08:00:00', $this->pharmacie->id);
    Event::fake([TourGardePublie::class]);

    $json = $this->postJson("/api/v1/admin/tours-garde/{$nouveau->id_public}/publier")->assertStatus(409)->json();

    verifierMeta($json);
    expect($json['error']['code'])->toBe('CONFLICT')
        ->and($nouveau->refresh()->statut)->toBe(StatutTour::Brouillon);
    Event::assertNotDispatched(TourGardePublie::class);
});

it('signale le chevauchement au contrôle sans rien modifier', function (): void {
    brouillon($this->ville->id, '2026-10-24 08:00:00', '2026-10-31 08:00:00', $this->pharmacie->id)->update(['statut' => StatutTour::Publie]);
    $nouveau = brouillon($this->ville->id, '2026-10-30 08:00:00', '2026-11-06 08:00:00');

    $json = $this->postJson("/api/v1/admin/tours-garde/{$nouveau->id_public}/controler")->assertOk()->json();

    $types = array_column($json['data']['problemes'], 'type');
    expect($json['data']['publiable'])->toBeFalse()
        ->and($types)->toContain('chevauchement')
        ->and($types)->toContain('tour_vide')
        ->and($types)->toContain('nuit_sans_garde');
});

it('publie, émet TourGardePublie et programme la notification du samedi', function (): void {
    $tour = brouillon($this->ville->id, '2026-10-24 08:00:00', '2026-10-31 08:00:00', $this->pharmacie->id);

    $this->postJson("/api/v1/admin/tours-garde/{$tour->id_public}/publier")
        ->assertOk()
        ->assertJsonPath('data.statut', 'publie')
        ->assertJsonPath('data.valide_par.id', $this->editeur->id_public);

    $envoi = EnvoiNotification::query()->where('reference', $tour->id_public)->sole();
    expect($envoi->statut)->toBe('en_attente')
        ->and($envoi->programme_le->utc()->format('Y-m-d H:i'))->toBe('2026-10-24 08:00')
        ->and($envoi->contenu['nombre'])->toBe(1);
});

it('ne modifie plus un tour publié', function (): void {
    $tour = brouillon($this->ville->id, '2026-10-24 08:00:00', '2026-10-31 08:00:00', $this->pharmacie->id);
    $tour->update(['statut' => StatutTour::Publie]);

    $this->deleteJson("/api/v1/admin/tours-garde/{$tour->id_public}")->assertStatus(409)->assertJsonPath('error.code', 'CONFLICT');
});
