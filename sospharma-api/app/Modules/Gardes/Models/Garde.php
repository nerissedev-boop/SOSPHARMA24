<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Pharmacies\Models\Pharmacie;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $id_public
 * @property int $tour_garde_id
 * @property int $pharmacie_id
 * @property CarbonImmutable $debut
 * @property CarbonImmutable $fin
 * @property CarbonImmutable|null $confirmee_le
 * @property-read TourGarde $tour
 * @property-read Pharmacie $pharmacie
 */
class Garde extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'ga';

    protected $table = 'gardes';

    protected $fillable = ['id_public', 'tour_garde_id', 'pharmacie_id', 'debut', 'fin', 'confirmee_le'];

    protected function casts(): array
    {
        return [
            'debut' => 'immutable_datetime',
            'fin' => 'immutable_datetime',
            'confirmee_le' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<TourGarde, $this> */
    public function tour(): BelongsTo
    {
        return $this->belongsTo(TourGarde::class, 'tour_garde_id');
    }

    /** @return BelongsTo<Pharmacie, $this> */
    public function pharmacie(): BelongsTo
    {
        return $this->belongsTo(Pharmacie::class);
    }
}
