<?php

declare(strict_types=1);

namespace App\Modules\Support\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Support\Models\MessageSupport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Vue équipe d'un message. @mixin MessageSupport */
class MessageSupportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'sujet' => $this->sujet->value,
            'message' => $this->message,
            'contact' => $this->contact,
            'a_une_capture' => $this->capture_chemin !== null,
            // Servie uniquement aux comptes de l'équipe, avec leur jeton.
            'capture_url' => $this->capture_chemin !== null ? url("/api/v1/admin/support/messages/{$this->id_public}/capture") : null,
            'statut' => $this->statut->value,
            'traite_le' => Dates::iso($this->traite_le),
            'cree_le' => Dates::iso($this->created_at),
        ];
    }
}
