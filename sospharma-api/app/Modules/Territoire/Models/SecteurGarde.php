<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Models;

use App\Commun\Geo\Geometrie;
use App\Commun\Modeles\AIdentifiantPublic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Découpage propre au tour de garde quand il diffère des communes.
 *
 * @property int $id
 * @property string $id_public
 * @property int $ville_id
 * @property string $nom
 * @property array<string, mixed>|null $contour
 * @property bool $actif
 */
class SecteurGarde extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'sg';

    protected $table = 'secteurs_garde';

    protected $fillable = ['id_public', 'ville_id', 'nom', 'contour', 'actif'];

    protected function casts(): array
    {
        return [
            'contour' => 'array',
            'actif' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (SecteurGarde $secteur): void {
            if ($secteur->contour !== null && $secteur->isDirty('contour')) {
                $secteur->contour = Geometrie::normaliser($secteur->contour);
                $rectangle = Geometrie::rectangleEnglobant($secteur->contour);
                $secteur->bbox_min_lat = $rectangle->minLat;
                $secteur->bbox_max_lat = $rectangle->maxLat;
                $secteur->bbox_min_lng = $rectangle->minLng;
                $secteur->bbox_max_lng = $rectangle->maxLng;
            }
        });
    }

    /** @return BelongsTo<Ville, $this> */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }
}
