<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Notifications\Models\EnvoiNotification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin EnvoiNotification */
class EnvoiNotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'type' => $this->type,
            'ville' => $this->relationLoaded('ville') && $this->ville !== null ? ['id' => $this->ville->id_public, 'nom' => $this->ville->nom] : null,
            'reference' => $this->reference,
            'titre' => $this->titre,
            'statut' => $this->statut,
            'programme_le' => Dates::iso($this->programme_le),
            'envoye_le' => Dates::iso($this->envoye_le),
            'destinataires' => $this->destinataires,
            'echecs' => $this->echecs,
            'tentatives' => $this->tentatives,
            'derniere_erreur' => $this->derniere_erreur,
        ];
    }
}
