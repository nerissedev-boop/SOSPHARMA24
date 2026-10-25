<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Resources;

use App\Commun\Support\Dates;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypePhoto;
use App\Modules\Releves\Models\Releve;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Proposition vue par l'usager qui l'a envoyée (« Mes propositions »).
 * Statuts simplifiés : en_verification, en_ligne, refusee. Ni position exacte ni photo en retour.
 *
 * @mixin Releve
 */
class PropositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $statut = match ($this->statut) {
            StatutReleve::Valide => 'en_ligne',
            StatutReleve::Rejete => 'refusee',
            default => 'en_verification',
        };

        return [
            'id' => $this->id_public,
            'identifiant' => $this->identifiant_client,
            'statut' => $statut,
            'nom' => (string) (($this->champsRetenus()['nom'] ?? null) ?? ''),
            'ville' => $this->relationLoaded('ville') ? ['id' => $this->ville->id_public, 'nom' => $this->ville->nom] : null,
            'photo_facade_recue' => $this->relationLoaded('photos') && $this->photo(TypePhoto::Facade) !== null,
            // Fiche publiée, pour l'ouvrir depuis « Mes propositions » (en ligne seulement).
            'pharmacie_id' => $statut === 'en_ligne' ? $this->resource->getAttribute('pharmacie_id_public') : null,
            'motif_refus' => $statut === 'refusee' ? $this->commentaire : null,
            'envoyee_le' => Dates::iso($this->recu_le),
            'traitee_le' => Dates::iso($this->traite_le),
        ];
    }
}
