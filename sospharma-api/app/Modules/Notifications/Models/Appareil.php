<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property string $id_public
 * @property string $identifiant_anonyme
 * @property string $jeton_hash
 * @property string|null $jeton_expo
 * @property string|null $plateforme
 * @property int|null $ville_id
 * @property int|null $zone_id
 * @property bool $notification_garde
 * @property bool $actif
 * @property-read Ville|null $ville
 * @property-read Zone|null $zone
 */
class Appareil extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'ap';

    protected $table = 'appareils';

    protected $fillable = [
        'id_public', 'identifiant_anonyme', 'jeton_hash', 'jeton_expo', 'plateforme',
        'ville_id', 'zone_id', 'notification_garde', 'actif', 'derniere_activite_le',
    ];

    protected $hidden = ['jeton_hash', 'jeton_expo'];

    protected function casts(): array
    {
        return [
            'notification_garde' => 'boolean',
            'actif' => 'boolean',
            'derniere_activite_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<Ville, $this> */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }

    /** @return BelongsTo<Zone, $this> */
    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    /** @return BelongsToMany<Pharmacie, $this> */
    public function favoris(): BelongsToMany
    {
        return $this->belongsToMany(Pharmacie::class, 'favoris')->withTimestamps();
    }

    public static function hacherJeton(string $jeton): string
    {
        return hash('sha256', $jeton);
    }
}
