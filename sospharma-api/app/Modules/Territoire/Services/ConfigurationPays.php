<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Services;

use App\Modules\Territoire\Enums\StatutVille;
use App\Modules\Territoire\Models\Pays;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Support\Facades\Cache;

/**
 * Configuration des pays (urgences, indicatif, fuseau, devise) gardée en cache,
 * vidée à chaque modification d'un pays ou d'une ville.
 */
final class ConfigurationPays
{
    /** v2 : le cache garde des tableaux (l'ancienne clé contenait des modèles sérialisés, illisibles). */
    private const CLE_PAYS = 'territoire.pays.actifs.v2';

    private const CLE_FUSEAUX = 'territoire.villes.fuseaux';

    private const CLE_RESUMES = 'territoire.pays.resumes.v2';

    /**
     * Le cache ne garde que les colonnes brutes : Laravel 13 refuse de désérialiser des objets
     * (`cache.serializable_classes` à false), un modèle mis en cache reviendrait incomplet.
     * Les modèles sont reconstruits à chaque lecture (casts compris).
     *
     * @return list<Pays>
     */
    public function paysActifs(): array
    {
        /** @var list<array<string, mixed>> $lignes */
        $lignes = Cache::rememberForever(self::CLE_PAYS, fn (): array => Pays::query()
            ->where('actif', true)
            ->orderBy('nom')
            ->get()
            ->map(fn (Pays $pays): array => $pays->getAttributes())
            ->all());

        return Pays::hydrate($lignes)->all();
    }

    /** Fuseau IANA d'une ville (via son pays). */
    public function fuseauDeVille(int $villeId): string
    {
        return $this->fuseauxParVille()[$villeId] ?? (string) config('app.timezone', 'UTC');
    }

    /** @return array<int, string> */
    public function fuseauxParVille(): array
    {
        /** @var array<int, string> */
        return Cache::rememberForever(self::CLE_FUSEAUX, fn (): array => Ville::query()
            ->join('pays', 'pays.id', '=', 'villes.pays_id')
            ->pluck('pays.fuseau', 'villes.id')
            ->map(fn ($fuseau): string => (string) $fuseau)
            ->all());
    }

    /**
     * Résumé d'un pays pour l'écran « Choix du pays » de l'app : « Abidjan ouvert, autres villes bientôt ».
     * Null s'il n'a aucune ville ouverte.
     */
    public function resume(int $paysId): ?string
    {
        $resume = $this->resumesParPays()[$paysId] ?? null;
        if ($resume === null) {
            return null;
        }
        // Phrase construite à chaque appel, dans la langue de la requête : le cache ne garde que les données.
        $villes = implode(', ', $resume['ouvertes']);
        $texte = count($resume['ouvertes']) > 1 ? __(':villes ouverts', ['villes' => $villes]) : __(':villes ouvert', ['villes' => $villes]);

        return $resume['bientot'] ? __(':resume, autres villes bientôt', ['resume' => $texte]) : $texte;
    }

    /** @return array<int, array{ouvertes: list<string>, bientot: bool}> */
    private function resumesParPays(): array
    {
        /** @var array<int, array{ouvertes: list<string>, bientot: bool}> */
        return Cache::rememberForever(self::CLE_RESUMES, function (): array {
            $resumes = [];
            $parPays = Ville::query()->where('actif', true)->orderBy('nom')->get(['pays_id', 'nom', 'statut'])->groupBy('pays_id');
            foreach ($parPays as $paysId => $villes) {
                $ouvertes = $villes->filter(fn (Ville $v): bool => $v->statut === StatutVille::Ouverte)->pluck('nom');
                if ($ouvertes->isEmpty()) {
                    continue;
                }
                $resumes[(int) $paysId] = [
                    'ouvertes' => $ouvertes->values()->all(),
                    'bientot' => $villes->contains(fn (Ville $v): bool => $v->statut === StatutVille::Bientot),
                ];
            }

            return $resumes;
        });
    }

    public static function viderCache(): void
    {
        Cache::forget(self::CLE_PAYS);
        Cache::forget(self::CLE_FUSEAUX);
        Cache::forget(self::CLE_RESUMES);
    }
}
