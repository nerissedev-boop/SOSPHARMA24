<?php

declare(strict_types=1);

namespace App\Modules\Releves\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Releves\Enums\TypePhoto;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $id_public
 * @property int $releve_id
 * @property TypePhoto $type
 * @property string $chemin
 * @property string $mime
 * @property int $taille_octets
 * @property int $largeur
 * @property int $hauteur
 * @property bool $metadonnees_supprimees
 * @property bool $publiee
 * @property string|null $chemin_public
 * @property-read Releve $releve
 */
class PhotoReleve extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'rp';

    protected $table = 'releves_photos';

    protected $fillable = [
        'id_public', 'releve_id', 'type', 'chemin', 'mime', 'taille_octets', 'largeur', 'hauteur',
        'metadonnees_supprimees', 'publiee', 'chemin_public',
    ];

    protected function casts(): array
    {
        return [
            'type' => TypePhoto::class,
            'taille_octets' => 'integer',
            'largeur' => 'integer',
            'hauteur' => 'integer',
            'metadonnees_supprimees' => 'boolean',
            'publiee' => 'boolean',
        ];
    }

    /** @return BelongsTo<Releve, $this> */
    public function releve(): BelongsTo
    {
        return $this->belongsTo(Releve::class);
    }
}
