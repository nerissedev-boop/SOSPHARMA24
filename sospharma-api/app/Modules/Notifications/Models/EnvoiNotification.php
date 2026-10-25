<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $id_public
 * @property string $type
 * @property int|null $ville_id
 * @property string|null $reference
 * @property string $titre
 * @property array<string, mixed>|null $contenu
 * @property string $statut en_attente | en_cours | envoye | echec
 * @property \Illuminate\Support\Carbon $programme_le
 * @property \Illuminate\Support\Carbon|null $envoye_le
 * @property int $destinataires
 * @property int $echecs
 * @property int $tentatives
 * @property int|null $curseur_appareil_id
 * @property string|null $derniere_erreur
 * @property-read Ville|null $ville
 */
class EnvoiNotification extends Model
{
    use AIdentifiantPublic;

    public const EN_ATTENTE = 'en_attente';

    public const EN_COURS = 'en_cours';

    public const ENVOYE = 'envoye';

    public const ECHEC = 'echec';

    protected const PREFIXE_ID = 'en';

    protected $table = 'envois_notification';

    protected $fillable = [
        'id_public', 'type', 'ville_id', 'reference', 'titre', 'contenu', 'statut', 'programme_le', 'envoye_le',
        'destinataires', 'echecs', 'tentatives', 'curseur_appareil_id', 'derniere_erreur',
    ];

    protected function casts(): array
    {
        return [
            'contenu' => 'array',
            'programme_le' => 'datetime',
            'envoye_le' => 'datetime',
            'destinataires' => 'integer',
            'echecs' => 'integer',
            'tentatives' => 'integer',
        ];
    }

    /** @return BelongsTo<Ville, $this> */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }
}
