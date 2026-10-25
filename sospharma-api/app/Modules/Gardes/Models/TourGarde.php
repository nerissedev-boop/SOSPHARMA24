<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Comptes\Models\User;
use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Territoire\Models\SecteurGarde;
use App\Modules\Territoire\Models\Ville;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Une période de garde d'une ville (ou d'un secteur), en brouillon ou publiée.
 *
 * @property int $id
 * @property string $id_public
 * @property int $ville_id
 * @property int|null $secteur_garde_id
 * @property CarbonImmutable $debut
 * @property CarbonImmutable $fin
 * @property StatutTour $statut
 * @property int|null $saisi_par
 * @property int|null $valide_par
 * @property CarbonImmutable|null $valide_le
 * @property bool $actif
 * @property-read Ville $ville
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Garde> $gardes
 */
class TourGarde extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'tg';

    protected $table = 'tours_garde';

    protected $fillable = ['id_public', 'ville_id', 'secteur_garde_id', 'debut', 'fin', 'statut', 'saisi_par', 'valide_par', 'valide_le', 'actif'];

    protected function casts(): array
    {
        return [
            'debut' => 'immutable_datetime',
            'fin' => 'immutable_datetime',
            'valide_le' => 'immutable_datetime',
            'statut' => StatutTour::class,
            'actif' => 'boolean',
        ];
    }

    /** @return BelongsTo<Ville, $this> */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }

    /** @return BelongsTo<SecteurGarde, $this> */
    public function secteur(): BelongsTo
    {
        return $this->belongsTo(SecteurGarde::class, 'secteur_garde_id');
    }

    /** @return HasMany<Garde, $this> */
    public function gardes(): HasMany
    {
        return $this->hasMany(Garde::class)->orderBy('debut');
    }

    /** @return BelongsTo<User, $this> */
    public function saisiPar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'saisi_par');
    }

    /** @return BelongsTo<User, $this> */
    public function validePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par');
    }

    public function estBrouillon(): bool
    {
        return $this->statut === StatutTour::Brouillon;
    }

    /**
     * @param  Builder<TourGarde>  $requete
     * @return Builder<TourGarde>
     */
    public function scopePublies(Builder $requete): Builder
    {
        return $requete->where('tours_garde.statut', StatutTour::Publie->value)->where('tours_garde.actif', true);
    }
}
