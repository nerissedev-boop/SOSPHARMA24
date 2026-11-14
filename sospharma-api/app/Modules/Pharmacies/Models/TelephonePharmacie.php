<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Models;

use App\Modules\Pharmacies\Enums\OrigineTelephone;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un numéro d'une pharmacie. Le rang 1 est le principal (bouton « Appeler »).
 * S'écrit par le service TelephonesPharmacie, qui tient à jour pharmacies.telephone et pharmacies.whatsapp.
 *
 * @property int $id
 * @property int $pharmacie_id
 * @property string $numero E.164
 * @property int $rang
 * @property bool $whatsapp
 * @property Carbon|null $whatsapp_confirme_le null : WhatsApp (ou son absence) non confirmé par une personne
 * @property int|null $whatsapp_confirme_par
 * @property OrigineTelephone $origine
 */
class TelephonePharmacie extends Model
{
    protected $table = 'telephones_pharmacie';

    protected $fillable = ['pharmacie_id', 'numero', 'rang', 'whatsapp', 'whatsapp_confirme_le', 'whatsapp_confirme_par', 'origine'];

    protected function casts(): array
    {
        return [
            'rang' => 'integer',
            'whatsapp' => 'boolean',
            'whatsapp_confirme_le' => 'datetime',
            'origine' => OrigineTelephone::class,
        ];
    }

    /** @return BelongsTo<Pharmacie, $this> */
    public function pharmacie(): BelongsTo
    {
        return $this->belongsTo(Pharmacie::class);
    }

    /** @return array{numero: string, principal: bool, whatsapp: bool} */
    public function enLigne(): array
    {
        return [
            'numero' => $this->numero,
            'principal' => $this->rang === 1,
            'whatsapp' => $this->whatsapp,
        ];
    }
}
