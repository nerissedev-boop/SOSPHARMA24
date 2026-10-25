<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Plage horaire habituelle, en heure locale. Plusieurs plages par jour possibles.
 *
 * @property int $id
 * @property int $pharmacie_id
 * @property int $jour 0 = dimanche … 6 = samedi
 * @property string $ouverture HH:MM[:SS]
 * @property string $fermeture HH:MM[:SS]
 */
class Horaire extends Model
{
    public $timestamps = false;

    protected $table = 'horaires';

    protected $fillable = ['pharmacie_id', 'jour', 'ouverture', 'fermeture'];

    protected function casts(): array
    {
        return ['jour' => 'integer'];
    }

    /** @return BelongsTo<Pharmacie, $this> */
    public function pharmacie(): BelongsTo
    {
        return $this->belongsTo(Pharmacie::class);
    }

    /** @return array{jour: int, ouverture: string, fermeture: string} */
    public function enPlage(): array
    {
        return [
            'jour' => $this->jour,
            'ouverture' => substr($this->ouverture, 0, 5),
            'fermeture' => substr($this->fermeture, 0, 5),
        ];
    }
}
