<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\CompteAvecRole;
use App\Modules\Gardes\Enums\StatutTour;
use App\Modules\Gardes\Events\TourGardePublie;
use App\Modules\Gardes\Exceptions\TourGardeEnConflit;
use App\Modules\Gardes\Exceptions\TourGardeNonModifiable;
use App\Modules\Gardes\Models\Garde;
use App\Modules\Gardes\Models\TourGarde;
use App\Modules\Pharmacies\Models\Pharmacie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Publication d'un tour : écriture en plusieurs étapes dans une transaction (verrou, contrôle, statut),
 * puis émission de TourGardePublie une fois la transaction validée.
 */
final class PublicationTourGarde
{
    public function __construct(private readonly ControleTourGarde $controle) {}

    public function publier(TourGarde $tour, CompteAvecRole $auteur): TourGarde
    {
        try {
            $publie = DB::transaction(function () use ($tour, $auteur): TourGarde {
                /** @var TourGarde $verrouille */
                $verrouille = TourGarde::query()->whereKey($tour->id)->lockForUpdate()->firstOrFail();
                if (! $verrouille->estBrouillon()) {
                    throw new TourGardeNonModifiable('Ce tour est déjà publié.');
                }

                $problemes = $this->controle->controler($verrouille);
                $conflits = array_values(array_filter($problemes, fn (ProblemeControle $p): bool => $p->type === ProblemeControle::CHEVAUCHEMENT));
                if ($conflits !== []) {
                    throw new TourGardeEnConflit(details: ['tours' => array_map(fn (ProblemeControle $p): string => $p->message, $conflits)]);
                }
                $bloquants = array_values(array_filter($problemes, fn (ProblemeControle $p): bool => $p->estBloquant()));
                if ($bloquants !== []) {
                    throw new DonneesInvalides('Le tour contient des erreurs à corriger avant publication.', [
                        'gardes' => array_map(fn (ProblemeControle $p): string => $p->message, $bloquants),
                    ]);
                }

                $verrouille->update([
                    'statut' => StatutTour::Publie,
                    'valide_par' => $auteur->idInterne(),
                    'valide_le' => now(),
                ]);

                return $verrouille;
            });
        } catch (TourGardeEnConflit|TourGardeNonModifiable|DonneesInvalides $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('Publication du tour annulée', ['tour' => $tour->id_public, 'erreur' => $e->getMessage()]);

            throw $e;
        }

        event(new TourGardePublie(
            $publie->id_public,
            $publie->ville_id,
            $publie->debut,
            $publie->fin,
            $publie->gardes()->distinct()->count('pharmacie_id'),
            $this->pharmaciesParZone($publie),
        ));

        return $publie->load(['ville', 'secteur', 'gardes.pharmacie.zone', 'saisiPar', 'validePar']);
    }

    /** @return array<int, int> */
    private function pharmaciesParZone(TourGarde $tour): array
    {
        return Pharmacie::query()
            ->whereIn('id', Garde::query()->where('tour_garde_id', $tour->id)->select('pharmacie_id'))
            ->whereNotNull('zone_id')
            ->selectRaw('zone_id, count(*) as nombre')
            ->groupBy('zone_id')
            ->pluck('nombre', 'zone_id')
            ->map(fn ($n): int => (int) $n)
            ->all();
    }
}
