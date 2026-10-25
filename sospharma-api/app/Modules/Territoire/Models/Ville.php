<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Territoire\Enums\StatutPays;
use App\Modules\Territoire\Enums\StatutVille;
use App\Modules\Territoire\Services\ConfigurationPays;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $id_public
 * @property int $pays_id
 * @property string $nom
 * @property StatutVille $statut
 * @property string $latitude
 * @property string $longitude
 * @property bool $actif
 * @property-read Pays $pays
 */
class Ville extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'vi';

    protected $table = 'villes';

    protected $fillable = ['id_public', 'pays_id', 'nom', 'statut', 'latitude', 'longitude', 'actif'];

    protected function casts(): array
    {
        return [
            'statut' => StatutVille::class,
            'latitude' => 'decimal:6',
            'longitude' => 'decimal:6',
            'actif' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => ConfigurationPays::viderCache());
    }

    /** @return BelongsTo<Pays, $this> */
    public function pays(): BelongsTo
    {
        return $this->belongsTo(Pays::class);
    }

    /** @return HasMany<Zone, $this> */
    public function zones(): HasMany
    {
        return $this->hasMany(Zone::class);
    }

    /** Une ville est couverte si elle et son pays sont ouverts et actifs. */
    public function estCouverte(): bool
    {
        return $this->actif
            && $this->statut === StatutVille::Ouverte
            && $this->pays->actif
            && $this->pays->statut === StatutPays::Ouvert;
    }
}
