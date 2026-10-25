<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Http\AppareilCourant;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * « Mes assurances » de l'usager, liées à l'appareil (sans compte), et calcul de accepte_mes_assurances.
 * L'appareil est identifié par le middleware du module Notifications (AppareilCourant).
 */
final class AssurancesAppareil
{
    public const MAX = 20;

    private const ATTRIBUT_REQUETE = 'assurances_appareil';

    /** @return Collection<int, Assurance> assurances actives de l'appareil */
    public function liste(int $appareilId): Collection
    {
        return Assurance::query()->actives()
            ->whereIn('id', DB::table('appareil_assurances')->where('appareil_id', $appareilId)->select('assurance_id'))
            ->orderBy('nom')
            ->get();
    }

    /**
     * Remplace toutes les assurances de l'appareil.
     *
     * @param  list<string>  $idsPublics
     * @return Collection<int, Assurance>
     */
    public function remplacer(int $appareilId, array $idsPublics): Collection
    {
        $idsPublics = array_values(array_unique($idsPublics));
        $connues = Assurance::query()->actives()->whereIn('id_public', $idsPublics)->pluck('id', 'id_public');
        $inconnues = array_values(array_diff($idsPublics, $connues->keys()->all()));
        if ($inconnues !== []) {
            throw new DonneesInvalides('', ['assurances' => ['Assurance inconnue ou désactivée : '.implode(', ', $inconnues).'.']]);
        }

        DB::transaction(function () use ($appareilId, $connues): void {
            DB::table('appareil_assurances')->where('appareil_id', $appareilId)->delete();
            $maintenant = now();
            DB::table('appareil_assurances')->insert($connues->values()->map(fn ($id): array => [
                'appareil_id' => $appareilId, 'assurance_id' => (int) $id, 'created_at' => $maintenant, 'updated_at' => $maintenant,
            ])->all());
        });

        return $this->liste($appareilId);
    }

    /**
     * Assurances actives de l'appareil qui appelle, lues une seule fois par requête.
     * null : pas d'appareil reconnu, ou appareil sans assurance enregistrée.
     *
     * @return list<int>|null
     */
    public static function idsPourRequete(Request $request): ?array
    {
        if ($request->attributes->has(self::ATTRIBUT_REQUETE)) {
            /** @var list<int>|null */
            return $request->attributes->get(self::ATTRIBUT_REQUETE);
        }

        $appareilId = AppareilCourant::id($request);
        $ids = null;
        if ($appareilId !== null) {
            $ids = DB::table('appareil_assurances')
                ->join('assurances', 'assurances.id', '=', 'appareil_assurances.assurance_id')
                ->where('appareil_assurances.appareil_id', $appareilId)
                ->where('assurances.actif', true)
                ->pluck('assurances.id')
                ->map(fn ($id): int => (int) $id)
                ->all();
            $ids = $ids === [] ? null : $ids;
        }
        $request->attributes->set(self::ATTRIBUT_REQUETE, $ids);

        return $ids;
    }

    /** Vrai si la pharmacie accepte au moins une des assurances de l'appareil ; null si l'appareil n'en a pas. */
    public static function accepte(Pharmacie $pharmacie, Request $request): ?bool
    {
        $miennes = self::idsPourRequete($request);
        if ($miennes === null) {
            return null;
        }
        $pharmacie->loadMissing('assurancesActives');

        return $pharmacie->assurancesActives->pluck('id')->intersect($miennes)->isNotEmpty();
    }

    /**
     * Assurances acceptées, au format des listes et fiches de l'app : régimes publics d'abord, puis par nom.
     *
     * @return list<array{id: string, nom: string, type: string, tiers_payant: bool}>
     */
    public static function presenter(Pharmacie $pharmacie): array
    {
        $pharmacie->loadMissing('assurancesActives');

        return $pharmacie->assurancesActives
            ->sortBy(fn (Assurance $a): string => $a->type->rang().'|'.mb_strtolower($a->nom))
            ->map(fn (Assurance $a): array => [
                'id' => $a->id_public,
                // Valeur des filtres de l'app (filter[assurances]=cmu,mugef-ci) et de « Mes assurances ».
                'slug' => $a->slug,
                'nom' => $a->nom,
                'type' => $a->type->value,
                'tiers_payant' => (bool) $a->pivot?->tiers_payant,
            ])
            ->values()
            ->all();
    }
}
