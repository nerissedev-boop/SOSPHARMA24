<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Resources;

use App\Commun\Geo\Distance;
use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Models\Horaire;
use App\Modules\Pharmacies\Services\AssurancesAppareil;
use App\Modules\Pharmacies\Services\PharmacieTrouvee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ligne de pharmacie pour les listes et la carte de l'app.
 *
 * @property PharmacieTrouvee $resource
 */
class PharmacieListeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $p = $this->resource->pharmacie;
        $statut = $this->resource->statut;
        $distance = $this->resource->distanceM;

        return [
            'id' => $p->id_public,
            'nom' => $p->nom,
            'adresse' => $p->adresse,
            'quartier' => $p->quartier,
            'zone' => $p->relationLoaded('zone') && $p->zone !== null ? ['id' => $p->zone->id_public, 'nom' => $p->zone->nom] : null,
            'ville' => $p->relationLoaded('ville') && $p->ville !== null ? ['id' => $p->ville->id_public, 'nom' => $p->ville->nom] : null,
            'telephone' => $p->telephone,
            'whatsapp' => $p->whatsapp,
            // null : position à confirmer (l'app affiche la pharmacie sans distance ni point sur la carte).
            'position' => $p->aUnePosition() ? ['lat' => $p->lat(), 'lng' => $p->lng()] : null,
            'h24' => $p->h24,
            'statut' => $statut->statut->value,
            'prochaine_ouverture' => Dates::iso($statut->prochaineOuverture),
            // Heure locale de fermeture si ouverte selon ses horaires (« Ferme à 20:00 »), sinon null.
            'ferme_a' => $statut->fermeA,
            // Horaires et garde en cours : l'app recalcule le statut hors connexion (même règle, cas-statut.json).
            'horaires' => $p->relationLoaded('horaires') ? $p->horaires->map(fn (Horaire $h): array => $h->enPlage())->values()->all() : [],
            'gardes' => $statut->garde !== null ? [['debut' => Dates::iso($statut->garde->debut), 'fin' => Dates::iso($statut->garde->fin)]] : [],
            'garde' => $statut->garde !== null ? [
                'debut' => Dates::iso($statut->garde->debut),
                'fin' => Dates::iso($statut->garde->fin),
                // Heure locale de fin si la garde s'arrête avant le matin (« 02:00 »), null = toute la nuit.
                'jusqua' => $statut->gardeJusqua,
                'confirmee_le' => Dates::iso($statut->garde->confirmeeLe),
            ] : null,
            'distance_m' => $distance,
            'marche_min' => $distance !== null ? Distance::marcheMinutes($distance) : null,
            'verifiee_le' => Dates::iso($p->verifiee_le),
            'photo_facade' => $p->urlPhotoFacade(),
            // Tableau de {id, nom, type, tiers_payant} ; l'app affiche 3 puces puis « + N autres ».
            'assurances' => AssurancesAppareil::presenter($p),
            // Vrai ou faux si l'appareil (X-Device-Token) a enregistré ses assurances, sinon null.
            'accepte_mes_assurances' => AssurancesAppareil::accepte($p, $request),
        ];
    }
}
