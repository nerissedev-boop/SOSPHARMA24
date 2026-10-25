<?php

declare(strict_types=1);

namespace App\Modules\Support\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Support\Models\MessageSupport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Accusé de réception pour l'app. @mixin MessageSupport */
class MessageRecuResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'sujet' => $this->sujet->value,
            'a_une_capture' => $this->capture_chemin !== null,
            'cree_le' => Dates::iso($this->created_at),
        ];
    }
}
