<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Comptes\Models\User;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property string $id_public
 * @property string|null $osm_id
 * @property int $ville_id
 * @property int|null $zone_id
 * @property string $nom
 * @property string $adresse
 * @property string|null $quartier
 * @property string|null $telephone
 * @property string|null $whatsapp
 * @property string|null $latitude null : position à confirmer (pharmacie de garde absente d'OpenStreetMap)
 * @property string|null $longitude
 * @property bool $h24
 * @property list<string>|null $services
 * @property string|null $photo_facade
 * @property Carbon|null $verifiee_le
 * @property bool $actif
 * @property-read Ville $ville
 * @property-read Zone|null $zone
 * @property-read Collection<int, Horaire> $horaires
 * @property-read Collection<int, Assurance> $assurances
 * @property-read Collection<int, Assurance> $assurancesActives
 */
class Pharmacie extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'ph';

    protected $table = 'pharmacies';

    protected $fillable = [
        'id_public', 'osm_id', 'ville_id', 'zone_id', 'nom', 'adresse', 'quartier', 'telephone', 'whatsapp',
        'latitude', 'longitude', 'h24', 'services', 'photo_facade', 'verifiee_le', 'actif',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:6',
            'longitude' => 'decimal:6',
            'h24' => 'boolean',
            'services' => 'array',
            'verifiee_le' => 'datetime',
            'actif' => 'boolean',
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

    /** @return HasMany<Horaire, $this> */
    public function horaires(): HasMany
    {
        return $this->hasMany(Horaire::class)->orderBy('jour')->orderBy('ouverture');
    }

    /**
     * Assurances acceptées (table pharmacie_assurances), avec tiers payant, remarque et date de vérification.
     *
     * @return BelongsToMany<Assurance, $this>
     */
    public function assurances(): BelongsToMany
    {
        return $this->belongsToMany(Assurance::class, 'pharmacie_assurances')
            ->using(PharmacieAssurance::class)
            ->withPivot(['tiers_payant', 'remarque', 'verifiee_le'])
            ->withTimestamps();
    }

    /**
     * Assurances acceptées encore actives dans le référentiel : ce que voient l'app et les filtres.
     *
     * @return BelongsToMany<Assurance, $this>
     */
    public function assurancesActives(): BelongsToMany
    {
        return $this->assurances()->where('assurances.actif', true);
    }

    /** @return BelongsToMany<User, $this> */
    public function membres(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'membres_pharmacie')->withTimestamps();
    }

    /**
     * @param  Builder<Pharmacie>  $requete
     * @return Builder<Pharmacie>
     */
    public function scopeActives(Builder $requete): Builder
    {
        return $requete->where('pharmacies.actif', true);
    }

    /** URL publique de la photo de façade (relevé terrain validé), ou null. */
    public function urlPhotoFacade(): ?string
    {
        return $this->photo_facade !== null ? Storage::disk('public')->url($this->photo_facade) : null;
    }

    /** Faux tant que la position n'a pas été relevée : ni distance, ni carte, ni itinéraire. */
    public function aUnePosition(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }

    public function lat(): ?float
    {
        return $this->latitude !== null ? (float) $this->latitude : null;
    }

    public function lng(): ?float
    {
        return $this->longitude !== null ? (float) $this->longitude : null;
    }
}
