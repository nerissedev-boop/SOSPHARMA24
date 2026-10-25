<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Resources;

use App\Modules\Releves\Models\Releve;
use App\Modules\Releves\Services\ReceptionPropositions;
use Illuminate\Http\Request;

/**
 * Relevé dans la file de validation. Le détail ajoute la pharmacie concernée, la comparaison
 * avant / après et les doublons possibles (avecDetail()).
 *
 * @mixin Releve
 */
class ReleveAdminResource extends ReleveResource
{
    /** @var array{pharmacie: array<string, mixed>|null, comparaison: list<array<string, mixed>>, doublons: list<array<string, mixed>>}|null */
    private ?array $detail = null;

    /** @param array{pharmacie: array<string, mixed>|null, comparaison: list<array<string, mixed>>, doublons: list<array<string, mixed>>} $detail */
    public function avecDetail(array $detail): static
    {
        $this->detail = $detail;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $donnees = parent::toArray($request) + [
            'origine' => $this->origine->value,
            'agent' => $this->relationLoaded('agent') && $this->agent !== null ? ['id' => $this->agent->id_public, 'nom' => $this->agent->nom] : null,
            // Proposition d'usager : fiabilité de l'appareil (aucune donnée personnelle).
            // Pharmacies proches que l'usager a vues et écartées avant l'envoi : un doublon reste possible si elles y figurent.
            'doublons_ecartes' => $this->doublons_ecartes ?? [],
            'appareil' => $this->estPublic() && $this->appareil_id !== null ? ReceptionPropositions::fiabilite($this->appareil_id) : null,
            'corrections' => $this->corrections,
            'traite_par' => $this->relationLoaded('traitePar') && $this->traitePar !== null
                ? ['id' => $this->traitePar->id_public, 'nom' => $this->traitePar->nom] : null,
        ];
        unset($donnees['identifiant']);

        return $this->detail !== null ? $donnees + $this->detail : $donnees;
    }
}
