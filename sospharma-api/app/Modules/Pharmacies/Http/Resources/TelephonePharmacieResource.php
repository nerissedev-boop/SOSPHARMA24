<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Pharmacies\Models\TelephonePharmacie;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Un numéro d'une fiche, pour l'espace agent et le back-office. whatsapp_confirme_le vaut aussi pour un « non » :
 * null veut dire que personne n'a encore vérifié (WhatsApp venu d'un import, ou jamais demandé).
 *
 * @mixin TelephonePharmacie
 */
class TelephonePharmacieResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_public,
            'numero' => $this->numero,
            'rang' => $this->rang,
            'principal' => $this->rang === 1,
            'whatsapp' => $this->whatsapp,
            'whatsapp_confirme_le' => Dates::iso($this->whatsapp_confirme_le),
            'origine' => $this->origine->value,
        ];
    }
}
