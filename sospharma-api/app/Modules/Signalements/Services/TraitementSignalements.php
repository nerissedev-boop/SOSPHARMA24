<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Services;

use App\Commun\Securite\CompteAvecRole;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Signalements\Enums\MotifSignalement;
use App\Modules\Signalements\Enums\StatutSignalement;
use App\Modules\Signalements\Exceptions\SignalementDejaTraite;
use App\Modules\Signalements\Models\Signalement;
use Illuminate\Support\Facades\DB;

final class TraitementSignalements
{
    public function recevoir(Pharmacie $pharmacie, MotifSignalement $motif, ?string $precisions, ?int $appareilId): Signalement
    {
        return Signalement::query()->create([
            'pharmacie_id' => $pharmacie->id,
            'motif' => $motif,
            'precisions' => $precisions,
            'appareil_id' => $appareilId,
            'statut' => StatutSignalement::Nouveau,
        ]);
    }

    public function cloturer(Signalement $signalement, StatutSignalement $statut, string $commentaire, CompteAvecRole $auteur): Signalement
    {
        return DB::transaction(function () use ($signalement, $statut, $commentaire, $auteur): Signalement {
            /** @var Signalement $verrouille */
            $verrouille = Signalement::query()->whereKey($signalement->id)->lockForUpdate()->firstOrFail();
            if ($verrouille->statut !== StatutSignalement::Nouveau) {
                throw new SignalementDejaTraite;
            }
            $verrouille->update([
                'statut' => $statut,
                'commentaire' => $commentaire,
                'traite_par' => $auteur->idInterne(),
                'traite_le' => now(),
            ]);

            return $verrouille;
        });
    }
}
