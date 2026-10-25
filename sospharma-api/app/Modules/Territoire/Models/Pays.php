<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Models;

use App\Modules\Territoire\Enums\StatutPays;
use App\Modules\Territoire\Services\ConfigurationPays;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $code
 * @property string $nom
 * @property string $indicatif
 * @property string $fuseau
 * @property string $devise
 * @property list<array{service: string, libelle: string, numero: string}> $urgences
 * @property list<string>|null $langues
 * @property string|null $support_whatsapp
 * @property string|null $support_telephone
 * @property string|null $support_email
 * @property StatutPays $statut
 * @property bool $actif
 */
class Pays extends Model
{
    protected $table = 'pays';

    protected $fillable = ['code', 'nom', 'indicatif', 'fuseau', 'devise', 'urgences', 'langues', 'support_whatsapp', 'support_telephone', 'support_email', 'statut', 'actif'];

    protected function casts(): array
    {
        return [
            'urgences' => 'array',
            'langues' => 'array',
            'statut' => StatutPays::class,
            'actif' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // La configuration des pays est en cache : on la vide à chaque modification.
        static::saved(fn () => ConfigurationPays::viderCache());
        static::deleted(fn () => ConfigurationPays::viderCache());
    }

    public function getRouteKeyName(): string
    {
        return 'code';
    }

    /** @return HasMany<Ville, $this> */
    public function villes(): HasMany
    {
        return $this->hasMany(Ville::class);
    }
}
