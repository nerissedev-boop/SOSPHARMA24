<?php

declare(strict_types=1);

namespace App\Modules\Releves\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Comptes\Models\User;
use App\Modules\Releves\Enums\OrigineReleve;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypePhoto;
use App\Modules\Releves\Enums\TypeReleve;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Relevé : position, photos et champs proposés par un agent terrain, ou par un usager anonyme (origine « public »).
 * La pharmacie n'est jamais lue ici par son modèle : on passe par le contrat EditionFichesPharmacies.
 *
 * @property int $id
 * @property string $id_public
 * @property string $identifiant_client
 * @property OrigineReleve $origine
 * @property int|null $agent_id
 * @property int|null $appareil_id
 * @property int $ville_id
 * @property int|null $pharmacie_id
 * @property TypeReleve $type
 * @property string $latitude
 * @property string $longitude
 * @property string $precision_m
 * @property int|null $ajustement_m
 * @property array<string, mixed> $champs
 * @property array<string, mixed>|null $corrections
 * @property array<string, mixed>|null $fiche_avant
 * @property list<string>|null $doublons_ecartes
 * @property StatutReleve $statut
 * @property string|null $commentaire
 * @property \Illuminate\Support\Carbon $releve_le
 * @property \Illuminate\Support\Carbon $recu_le
 * @property int|null $traite_par
 * @property \Illuminate\Support\Carbon|null $traite_le
 * @property-read User|null $agent
 * @property-read User|null $traitePar
 * @property-read Ville $ville
 * @property-read \Illuminate\Database\Eloquent\Collection<int, PhotoReleve> $photos
 */
class Releve extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 're';

    protected $table = 'releves';

    protected $fillable = [
        'id_public', 'identifiant_client', 'origine', 'agent_id', 'appareil_id', 'ville_id', 'pharmacie_id', 'type',
        'latitude', 'longitude', 'precision_m', 'ajustement_m', 'champs', 'corrections', 'fiche_avant', 'doublons_ecartes',
        'statut', 'commentaire', 'releve_le', 'recu_le', 'traite_par', 'traite_le',
    ];

    protected function casts(): array
    {
        return [
            'origine' => OrigineReleve::class,
            'type' => TypeReleve::class,
            'statut' => StatutReleve::class,
            'latitude' => 'decimal:6',
            'longitude' => 'decimal:6',
            'precision_m' => 'decimal:1',
            'ajustement_m' => 'integer',
            'champs' => 'array',
            'corrections' => 'array',
            'fiche_avant' => 'array',
            'doublons_ecartes' => 'array',
            'releve_le' => 'datetime',
            'recu_le' => 'datetime',
            'traite_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    /** @return BelongsTo<User, $this> */
    public function traitePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'traite_par');
    }

    /** @return BelongsTo<Ville, $this> */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }

    /** @return HasMany<PhotoReleve, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(PhotoReleve::class)->orderBy('id');
    }

    public function photo(TypePhoto $type): ?PhotoReleve
    {
        return $this->photos->first(fn (PhotoReleve $p): bool => $p->type === $type);
    }

    /**
     * Champs retenus : ceux de l'agent, complétés ou remplacés par les corrections de l'équipe.
     *
     * @return array<string, mixed>
     */
    public function champsRetenus(): array
    {
        return array_replace($this->champs ?? [], $this->corrections ?? []);
    }

    public function estPublic(): bool
    {
        return $this->origine === OrigineReleve::Public;
    }

    public function lat(): float
    {
        return (float) $this->latitude;
    }

    public function lng(): float
    {
        return (float) $this->longitude;
    }
}
