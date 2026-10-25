<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Modules\Pharmacies\Enums\SourceProposition;
use App\Modules\Pharmacies\Enums\StatutProposition;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Models\PropositionAssurance;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Assurances acceptées par une pharmacie, et propositions d'assurances absentes du référentiel. */
final class AssurancesPharmacie
{
    /**
     * Remplace toutes les assurances d'une pharmacie (tout ou rien).
     *
     * @param  list<array{id: string, tiers_payant?: bool|null, remarque?: string|null}>  $lignes
     */
    public function remplacer(Pharmacie $pharmacie, array $lignes): Pharmacie
    {
        $liens = $this->liens($pharmacie->ville_id, $lignes, 'assurances');

        DB::transaction(function () use ($pharmacie, $liens): void {
            $pharmacie->assurances()->sync($liens);
        });

        return $pharmacie->load('assurances');
    }

    /**
     * Prépare les lignes de pharmacie_assurances après contrôle : assurances connues, actives, du pays de la ville.
     *
     * @param  list<array{id: string, tiers_payant?: bool|null, remarque?: string|null}>  $lignes
     * @return array<int, array{tiers_payant: bool, remarque: string|null, verifiee_le: Carbon}>
     */
    public function liens(int $villeId, array $lignes, string $champ): array
    {
        $paysId = $this->paysDeVille($villeId);
        $ids = array_values(array_unique(array_map(fn (array $l): string => (string) $l['id'], $lignes)));
        $connues = Assurance::query()->actives()->where('pays_id', $paysId)->whereIn('id_public', $ids)->pluck('id', 'id_public');

        $erreurs = [];
        $liens = [];
        foreach ($lignes as $i => $ligne) {
            $id = $connues->get((string) $ligne['id']);
            if ($id === null) {
                $erreurs["{$champ}.{$i}.id"] = ['Assurance inconnue, désactivée ou d\'un autre pays.'];

                continue;
            }
            $liens[(int) $id] = [
                'tiers_payant' => (bool) ($ligne['tiers_payant'] ?? false),
                'remarque' => isset($ligne['remarque']) && $ligne['remarque'] !== '' ? $ligne['remarque'] : null,
                'verifiee_le' => now(),
            ];
        }
        if ($erreurs !== []) {
            throw new DonneesInvalides('', $erreurs);
        }

        return $liens;
    }

    /**
     * Identifiants publics inconnus (ou désactivés, ou d'un autre pays) parmi ceux donnés.
     *
     * @param  list<string>  $idsPublics
     * @return list<string>
     */
    public function inconnues(int $villeId, array $idsPublics): array
    {
        if ($idsPublics === []) {
            return [];
        }
        $connues = Assurance::query()->actives()->where('pays_id', $this->paysDeVille($villeId))
            ->whereIn('id_public', $idsPublics)->pluck('id_public')->all();

        return array_values(array_diff($idsPublics, $connues));
    }

    /**
     * Enregistre des noms libres d'assurances absentes. Un nom qui correspond déjà à une assurance active
     * du pays (même slug) est directement relié à la pharmacie ; un nom déjà proposé et en attente est ignoré.
     *
     * @param  list<string>  $noms
     * @return list<PropositionAssurance> propositions créées
     */
    public function proposer(int $villeId, ?int $pharmacieId, array $noms, SourceProposition $source, ?int $auteurId = null, ?int $releveId = null): array
    {
        $paysId = $this->paysDeVille($villeId);
        $creees = [];

        foreach (array_unique(array_filter(array_map(fn ($n): string => trim((string) $n), $noms))) as $nom) {
            $existante = Assurance::query()->actives()->where('pays_id', $paysId)->where('slug', Str::slug($nom))->first();
            if ($existante !== null) {
                if ($pharmacieId !== null) {
                    Pharmacie::query()->findOrFail($pharmacieId)->assurances()->syncWithoutDetaching([
                        $existante->id => ['tiers_payant' => false, 'verifiee_le' => now()],
                    ]);
                }

                continue;
            }

            $dejaProposee = PropositionAssurance::query()
                ->where('pays_id', $paysId)
                ->where('statut', StatutProposition::EnAttente->value)
                ->where('pharmacie_id', $pharmacieId)
                ->whereRaw('LOWER(nom) = ?', [mb_strtolower($nom)])
                ->exists();
            if ($dejaProposee) {
                continue;
            }

            $creees[] = PropositionAssurance::query()->create([
                'pays_id' => $paysId,
                'pharmacie_id' => $pharmacieId,
                'nom' => mb_substr($nom, 0, 150),
                'source' => $source,
                'releve_id' => $releveId,
                'propose_par' => $auteurId,
                'statut' => StatutProposition::EnAttente,
            ]);
        }

        return $creees;
    }

    private function paysDeVille(int $villeId): int
    {
        return (int) Ville::query()->whereKey($villeId)->value('pays_id');
    }
}
