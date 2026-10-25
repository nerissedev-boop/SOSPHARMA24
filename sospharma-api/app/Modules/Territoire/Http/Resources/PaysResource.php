<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Resources;

use App\Modules\Territoire\Models\Pays;
use App\Modules\Territoire\Services\ConfigurationPays;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pays */
class PaysResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'nom' => $this->nom,
            'indicatif' => $this->indicatif,
            'fuseau' => $this->fuseau,
            'devise' => $this->devise,
            'urgences' => $this->urgences ?? [],
            'langues' => $this->langues,
            'statut' => $this->statut->value,
            // « Abidjan ouvert, autres villes bientôt » (écran « Choix du pays »), null sans ville ouverte.
            'resume' => app(ConfigurationPays::class)->resume($this->id),
            // Coordonnées du support (« Nous contacter ») ; null tant qu'elles ne sont pas renseignées.
            'support' => [
                'whatsapp' => $this->support_whatsapp,
                'telephone' => $this->support_telephone,
                'email' => $this->support_email,
            ],
            'actif' => $this->actif,
        ];
    }
}
