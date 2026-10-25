<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Models;

use App\Commun\Geo\Geometrie;
use App\Commun\Geo\Rectangle;
use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Services\ZoneDepuisPosition;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Commune ou quartier, avec son contour GeoJSON et son rectangle englobant indexé.
 *
 * @property int $id
 * @property string $id_public
 * @property int $ville_id
 * @property string $nom
 * @property TypeZone $type
 * @property array<string, mixed> $contour
 * @property string|null $contour_source
 * @property string $centre_lat
 * @property string $centre_lng
 * @property bool $actif
 * @property-read Ville $ville
 */
class Zone extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'zo';

    protected $table = 'zones';

    protected $fillable = ['id_public', 'ville_id', 'nom', 'type', 'contour', 'contour_source', 'actif'];

    protected function casts(): array
    {
        return [
            'type' => TypeZone::class,
            'contour' => 'array',
            'bbox_min_lat' => 'float',
            'bbox_max_lat' => 'float',
            'bbox_min_lng' => 'float',
            'bbox_max_lng' => 'float',
            'centre_lat' => 'decimal:6',
            'centre_lng' => 'decimal:6',
            'actif' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Le rectangle englobant et le centre se recalculent à chaque changement de contour.
        static::saving(function (Zone $zone): void {
            if ($zone->isDirty('contour') || $zone->centre_lat === null) {
                $zone->contour = Geometrie::normaliser($zone->contour);
                $rectangle = Geometrie::rectangleEnglobant($zone->contour);
                $zone->bbox_min_lat = $rectangle->minLat;
                $zone->bbox_max_lat = $rectangle->maxLat;
                $zone->bbox_min_lng = $rectangle->minLng;
                $zone->bbox_max_lng = $rectangle->maxLng;
                $centre = $rectangle->centre();
                $zone->centre_lat = $centre['lat'];
                $zone->centre_lng = $centre['lng'];
            }
        });
        static::saved(fn (Zone $zone) => ZoneDepuisPosition::oublierContour($zone->id));
        static::deleted(fn (Zone $zone) => ZoneDepuisPosition::oublierContour($zone->id));
    }

    /** @return BelongsTo<Ville, $this> */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }

    public function rectangle(): Rectangle
    {
        return new Rectangle(
            (float) $this->bbox_min_lat,
            (float) $this->bbox_max_lat,
            (float) $this->bbox_min_lng,
            (float) $this->bbox_max_lng,
        );
    }

    /**
     * @param  Builder<Zone>  $requete
     * @return Builder<Zone>
     */
    public function scopeContenantRectangle(Builder $requete, float $lat, float $lng): Builder
    {
        return $requete
            ->where('bbox_min_lat', '<=', $lat)
            ->where('bbox_max_lat', '>=', $lat)
            ->where('bbox_min_lng', '<=', $lng)
            ->where('bbox_max_lng', '>=', $lng);
    }
}
