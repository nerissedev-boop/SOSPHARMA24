<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\CompteAvecRole;
use App\Modules\Pharmacies\Enums\StatutProposition;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Pharmacies\Exceptions\PropositionDejaTraitee;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\PropositionAssurance;
use Illuminate\Support\Facades\DB;

/** L'équipe accepte une proposition d'assurance (création ou rattachement à une assurance existante) ou la rejette. */
final class TraitementPropositions
{
    public function __construct(private readonly GestionAssurances $referentiel) {}

    /**
     * Accepte : « assurance » rattache à une assurance existante du pays ; sinon nom, slug et type créent l'assurance.
     *
     * @param  array{assurance?: string|null, nom?: string|null, slug?: string|null, type?: string|null, commentaire?: string|null}  $donnees
     */
    public function accepter(PropositionAssurance $proposition, array $donnees, CompteAvecRole $auteur): PropositionAssurance
    {
        return DB::transaction(function () use ($proposition, $donnees, $auteur): PropositionAssurance {
            $verrouillee = $this->verrouiller($proposition);

            if (! empty($donnees['assurance'])) {
                $assurance = Assurance::query()->where('id_public', $donnees['assurance'])->where('pays_id', $verrouillee->pays_id)->first()
                    ?? throw new DonneesInvalides('', ['assurance' => ['Assurance inconnue dans ce pays.']]);
            } else {
                if (empty($donnees['type'])) {
                    throw new DonneesInvalides('', ['type' => ['Choisissez le type de la nouvelle assurance.']]);
                }
                $nom = trim((string) ($donnees['nom'] ?? '')) ?: $verrouillee->nom;
                $slug = GestionAssurances::slug($donnees['slug'] ?? null, $nom);
                $assurance = Assurance::query()->where('pays_id', $verrouillee->pays_id)->where('slug', $slug)->first()
                    ?? $this->referentiel->creer([
                        'pays' => (string) $verrouillee->pays()->value('code'),
                        'nom' => $nom,
                        'slug' => $slug,
                        'type' => TypeAssurance::from((string) $donnees['type'])->value,
                    ]);
            }

            if ($verrouillee->pharmacie_id !== null) {
                $verrouillee->pharmacie()->firstOrFail()->assurances()->syncWithoutDetaching([
                    $assurance->id => ['tiers_payant' => false, 'verifiee_le' => now()],
                ]);
            }

            $verrouillee->update([
                'statut' => StatutProposition::Acceptee,
                'assurance_id' => $assurance->id,
                'commentaire' => $donnees['commentaire'] ?? null,
                'traite_par' => $auteur->idInterne(),
                'traite_le' => now(),
            ]);

            return $verrouillee->load(['pays', 'pharmacie', 'assurance']);
        });
    }

    public function rejeter(PropositionAssurance $proposition, string $raison, CompteAvecRole $auteur): PropositionAssurance
    {
        return DB::transaction(function () use ($proposition, $raison, $auteur): PropositionAssurance {
            $verrouillee = $this->verrouiller($proposition);
            $verrouillee->update([
                'statut' => StatutProposition::Rejetee,
                'commentaire' => $raison,
                'traite_par' => $auteur->idInterne(),
                'traite_le' => now(),
            ]);

            return $verrouillee->load(['pays', 'pharmacie', 'assurance']);
        });
    }

    private function verrouiller(PropositionAssurance $proposition): PropositionAssurance
    {
        /** @var PropositionAssurance $verrouillee */
        $verrouillee = PropositionAssurance::query()->whereKey($proposition->id)->lockForUpdate()->firstOrFail();
        if ($verrouillee->statut !== StatutProposition::EnAttente) {
            throw new PropositionDejaTraitee;
        }

        return $verrouillee;
    }
}
