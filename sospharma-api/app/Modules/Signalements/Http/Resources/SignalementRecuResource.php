<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Signalements\Models\Signalement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Accusé de réception renvoyé à l'app (sans données internes). @mixin Signalement */
class SignalementRecuResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'motif' => $this->motif->value,
            'statut' => $this->statut->value,
            'cree_le' => Dates::iso($this->created_at),
        ];
    }
}
