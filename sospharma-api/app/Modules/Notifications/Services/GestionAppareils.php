<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Modules\Notifications\Models\Appareil;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Support\Str;

/** Enregistrement des appareils (sans compte) et préférences liées. */
final class GestionAppareils
{
    /**
     * Enregistre (ou réenregistre) un appareil et lui remet un nouveau jeton, montré une seule fois.
     *
     * @param  array{identifiant_anonyme: string, jeton_expo?: string|null, plateforme?: string|null, ville?: string|null, zone?: string|null, notification_garde?: bool}  $donnees
     * @return array{appareil: Appareil, jeton: string}
     */
    public function enregistrer(array $donnees): array
    {
        $jeton = 'dev_'.Str::random(48);
        $appareil = Appareil::query()->firstOrNew(['identifiant_anonyme' => $donnees['identifiant_anonyme']]);
        $appareil->fill($this->preferences($donnees, $appareil) + [
            'jeton_hash' => Appareil::hacherJeton($jeton),
            'jeton_expo' => $donnees['jeton_expo'] ?? $appareil->jeton_expo,
            'plateforme' => $donnees['plateforme'] ?? $appareil->plateforme,
            'actif' => true,
            'derniere_activite_le' => now(),
        ]);
        if (! $appareil->exists && ! array_key_exists('notification_garde', $donnees)) {
            $appareil->notification_garde = true;
        }
        $appareil->save();

        return ['appareil' => $appareil->load(['ville', 'zone']), 'jeton' => $jeton];
    }

    /** @param array{jeton_expo?: string|null, ville?: string|null, zone?: string|null, notification_garde?: bool} $donnees */
    public function modifier(Appareil $appareil, array $donnees): Appareil
    {
        $attributs = $this->preferences($donnees, $appareil);
        if (array_key_exists('jeton_expo', $donnees)) {
            $attributs['jeton_expo'] = $donnees['jeton_expo'];
        }
        $appareil->update($attributs + ['derniere_activite_le' => now()]);

        return $appareil->load(['ville', 'zone']);
    }

    /** DELETE /appareils/moi : coupe les notifications (les favoris restent). */
    public function desactiverNotifications(Appareil $appareil): Appareil
    {
        $appareil->update(['notification_garde' => false, 'jeton_expo' => null]);

        return $appareil->load(['ville', 'zone']);
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @return array<string, mixed>
     */
    private function preferences(array $donnees, Appareil $appareil): array
    {
        $attributs = [];
        if (array_key_exists('ville', $donnees)) {
            $attributs['ville_id'] = $donnees['ville'] !== null
                ? Ville::query()->where('id_public', $donnees['ville'])->value('id')
                : null;
        }
        if (array_key_exists('zone', $donnees)) {
            if ($donnees['zone'] === null) {
                $attributs['zone_id'] = null;
            } else {
                $zone = Zone::query()->where('id_public', $donnees['zone'])->firstOrFail();
                $villeId = $attributs['ville_id'] ?? $appareil->ville_id;
                if ($villeId !== null && $zone->ville_id !== $villeId) {
                    throw new DonneesInvalides('', ['zone' => ['Cette commune n\'appartient pas à la ville suivie.']]);
                }
                $attributs['zone_id'] = $zone->id;
                $attributs['ville_id'] ??= $zone->ville_id;
            }
        }
        if (array_key_exists('notification_garde', $donnees)) {
            $attributs['notification_garde'] = (bool) $donnees['notification_garde'];
        }

        return $attributs;
    }
}
