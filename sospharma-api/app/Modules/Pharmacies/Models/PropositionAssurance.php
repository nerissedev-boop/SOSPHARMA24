<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Comptes\Models\User;
use App\Modules\Pharmacies\Enums\SourceProposition;
use App\Modules\Pharmacies\Enums\StatutProposition;
use App\Modules\Territoire\Models\Pays;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Assurance absente du référentiel, proposée en nom libre et validée par l'équipe.
 *
 * @property int $id
 * @property string $id_public
 * @property int $pays_id
 * @property int|null $pharmacie_id
 * @property string $nom
 * @property SourceProposition $source
 * @property int|null $releve_id
 * @property int|null $propose_par
 * @property StatutProposition $statut
 * @property int|null $assurance_id
 * @property string|null $commentaire
 * @property int|null $traite_par
 * @property Carbon|null $traite_le
 * @property-read Pays $pays
 * @property-read Pharmacie|null $pharmacie
 * @property-read Assurance|null $assurance
 */
class PropositionAssurance extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'pa';

    protected $table = 'propositions_assurance';

    protected $fillable = [
        'id_public', 'pays_id', 'pharmacie_id', 'nom', 'source', 'releve_id', 'propose_par',
        'statut', 'assurance_id', 'commentaire', 'traite_par', 'traite_le',
    ];

    protected function casts(): array
    {
        return [
            'source' => SourceProposition::class,
            'statut' => StatutProposition::class,
            'traite_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<Pays, $this> */
    public function pays(): BelongsTo
    {
        return $this->belongsTo(Pays::class);
    }

    /** @return BelongsTo<Pharmacie, $this> */
    public function pharmacie(): BelongsTo
    {
        return $this->belongsTo(Pharmacie::class);
    }

    /** @return BelongsTo<Assurance, $this> */
    public function assurance(): BelongsTo
    {
        return $this->belongsTo(Assurance::class);
    }

    /** @return BelongsTo<User, $this> */
    public function proposePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'propose_par');
    }

    /** @return BelongsTo<User, $this> */
    public function traitePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'traite_par');
    }
}
