<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Notifications\Models\Appareil;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Appareil */
class AppareilResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'plateforme' => $this->plateforme,
            'ville' => $this->relationLoaded('ville') && $this->ville !== null ? ['id' => $this->ville->id_public, 'nom' => $this->ville->nom] : null,
            'zone' => $this->relationLoaded('zone') && $this->zone !== null ? ['id' => $this->zone->id_public, 'nom' => $this->zone->nom] : null,
            'notification_garde' => (bool) $this->notification_garde,
            'notifications_actives' => $this->jeton_expo !== null && $this->notification_garde,
            'cree_le' => Dates::iso($this->created_at),
        ];
    }
}
