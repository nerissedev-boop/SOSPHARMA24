<?php

declare(strict_types=1);

namespace App\Modules\Support\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Modules\Support\Enums\StatutMessage;
use App\Modules\Support\Enums\SujetMessage;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $id_public
 * @property SujetMessage $sujet
 * @property string $message
 * @property string|null $contact
 * @property string|null $capture_chemin
 * @property string|null $capture_type
 * @property int|null $appareil_id
 * @property StatutMessage $statut
 * @property int|null $traite_par
 * @property \Illuminate\Support\Carbon|null $traite_le
 */
class MessageSupport extends Model
{
    use AIdentifiantPublic;

    protected const PREFIXE_ID = 'ms';

    protected $table = 'messages_support';

    protected $fillable = ['id_public', 'sujet', 'message', 'contact', 'capture_chemin', 'capture_type', 'appareil_id', 'statut', 'traite_par', 'traite_le'];

    protected function casts(): array
    {
        return [
            'sujet' => SujetMessage::class,
            'statut' => StatutMessage::class,
            'traite_le' => 'datetime',
        ];
    }
}
