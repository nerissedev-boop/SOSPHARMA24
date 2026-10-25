<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Comptes\Models\User;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Signalements\Enums\MotifSignalement;
use App\Modules\Signalements\Enums\StatutSignalement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $id_public
 * @property int $pharmacie_id
 * @property MotifSignalement $motif
 * @property string|null $precisions
 * @property int|null $appareil_id
 * @property StatutSignalement $statut
 * @property string|null $commentaire
 * @property int|null $traite_par
 * @property \Illuminate\Support\Carbon|null $traite_le
 * @property-read Pharmacie $pharmacie
 */
class Signalement extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'si';

    protected $table = 'signalements';

    protected $fillable = ['id_public', 'pharmacie_id', 'motif', 'precisions', 'appareil_id', 'statut', 'commentaire', 'traite_par', 'traite_le'];

    protected function casts(): array
    {
        return [
            'motif' => MotifSignalement::class,
            'statut' => StatutSignalement::class,
            'traite_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<Pharmacie, $this> */
    public function pharmacie(): BelongsTo
    {
        return $this->belongsTo(Pharmacie::class);
    }

    /** @return BelongsTo<User, $this> */
    public function traitePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'traite_par');
    }
}
