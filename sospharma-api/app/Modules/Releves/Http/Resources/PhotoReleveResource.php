<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Releves\Models\PhotoReleve;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PhotoReleve */
class PhotoReleveResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'type' => $this->type->value,
            'largeur' => $this->largeur,
            'hauteur' => $this->hauteur,
            'taille_octets' => $this->taille_octets,
            'metadonnees_supprimees' => $this->metadonnees_supprimees,
            'publiee' => $this->publiee,
            'envoyee_le' => Dates::iso($this->updated_at),
        ];
    }
}
