<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Territoire\Models\Pays;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Storage;

/**
 * Assureur ou mutuelle du référentiel d'un pays.
 *
 * @property int $id
 * @property string $id_public
 * @property int $pays_id
 * @property string $nom
 * @property string $slug
 * @property TypeAssurance $type
 * @property string|null $logo
 * @property bool $actif
 * @property-read Pays $pays
 * @property-read PharmacieAssurance|null $pivot
 */
class Assurance extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'as';

    protected $table = 'assurances';

    protected $fillable = ['id_public', 'pays_id', 'nom', 'slug', 'type', 'logo', 'actif'];

    protected function casts(): array
    {
        return [
            'type' => TypeAssurance::class,
            'actif' => 'boolean',
        ];
    }

    /** @return BelongsTo<Pays, $this> */
    public function pays(): BelongsTo
    {
        return $this->belongsTo(Pays::class);
    }

    /** @return BelongsToMany<Pharmacie, $this> */
    public function pharmacies(): BelongsToMany
    {
        return $this->belongsToMany(Pharmacie::class, 'pharmacie_assurances')
            ->using(PharmacieAssurance::class)
            ->withPivot(['tiers_payant', 'remarque', 'verifiee_le'])
            ->withTimestamps();
    }

    /**
     * @param  Builder<Assurance>  $requete
     * @return Builder<Assurance>
     */
    public function scopeActives(Builder $requete): Builder
    {
        return $requete->where('assurances.actif', true);
    }

    /** URL du logo : URL absolue telle quelle, sinon fichier du disque public. */
    public function urlLogo(): ?string
    {
        if ($this->logo === null || $this->logo === '') {
            return null;
        }

        return str_starts_with($this->logo, 'https://') ? $this->logo : Storage::disk('public')->url($this->logo);
    }
}
