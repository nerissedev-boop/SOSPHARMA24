<?php

declare(strict_types=1);

namespace App\Modules\Releves\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Erreurs\ExceptionMetier;
use App\Commun\Securite\CompteAvecRole;
use App\Modules\Pharmacies\Contrats\EditionFichesPharmacies;
use App\Modules\Releves\Enums\StatutReleve;
use App\Modules\Releves\Enums\TypePhoto;
use App\Modules\Releves\Enums\TypeReleve;
use App\Modules\Releves\Events\PropositionTraitee;
use App\Modules\Releves\Exceptions\ReleveNonModifiable;
use App\Modules\Releves\Models\Releve;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Traitement d'un relevé par l'équipe : valider (la fiche est créée ou mise à jour PAR LE CONTRAT du module
 * Pharmacies, la photo de façade devient publique), demander une correction, ou rejeter.
 * Une proposition d'usager (origine « public ») peut aussi être fusionnée avec une pharmacie existante ;
 * l'appareil est prévenu par l'événement PropositionTraitee, émis après la transaction.
 */
final class ValidationReleves
{
    public function __construct(
        private readonly EditionFichesPharmacies $fiches,
        private readonly PhotosReleves $photos,
        private readonly ReceptionReleves $reception,
    ) {}

    /**
     * Tout ou rien : fiche, liens, propositions d'assurances, photo publique et statut du relevé
     * sont écrits dans une seule transaction. En cas d'échec, la copie publique de la photo est supprimée.
     *
     * @param  array<string, mixed>  $corrections  champs corrigés par l'équipe (même format que les champs proposés)
     * @param  string|null  $fusionnerAvec  identifiant public (ph_…) : le relevé devient une mise à jour de cette pharmacie
     */
    public function valider(Releve $releve, CompteAvecRole $auteur, array $corrections = [], ?string $fusionnerAvec = null): Releve
    {
        $cheminPublic = null;
        $anciennePhoto = null;

        try {
            $valide = DB::transaction(function () use ($releve, $auteur, $corrections, $fusionnerAvec, &$cheminPublic, &$anciennePhoto): Releve {
                /** @var Releve $verrouille */
                $verrouille = Releve::query()->whereKey($releve->id)->lockForUpdate()->firstOrFail();
                if ($verrouille->statut !== StatutReleve::Envoye) {
                    throw new ReleveNonModifiable('Seul un relevé « envoyé » peut être validé.');
                }
                $verrouille->load('photos');
                $facade = $verrouille->photo(TypePhoto::Facade)
                    ?? throw new DonneesInvalides('', ['photos' => ['La photo de façade est obligatoire pour valider un relevé.']]);

                if ($fusionnerAvec !== null) {
                    $cible = $this->fiches->parIdPublic($fusionnerAvec)
                        ?? throw new DonneesInvalides('', ['fusionner_avec' => ['Pharmacie inconnue.']]);
                    $verrouille->type = TypeReleve::MiseAJour;
                    $verrouille->pharmacie_id = $cible->id;
                }

                $corrections = $corrections !== [] ? $this->reception->champs($corrections, $verrouille->ville_id) : [];
                $champs = array_replace($verrouille->champs ?? [], $corrections);
                if ($verrouille->type === TypeReleve::Creation) {
                    // Une proposition d'usager n'a pas d'adresse : l'équipe la complète dans les corrections.
                    foreach (['nom', 'adresse'] as $obligatoire) {
                        if (empty($champs[$obligatoire])) {
                            throw new DonneesInvalides('', ["corrections.{$obligatoire}" => ['Ce champ est obligatoire pour créer la pharmacie : complétez-le dans les corrections.']]);
                        }
                    }
                }
                $propositions = (array) ($champs['assurances_proposees'] ?? []);
                unset($champs['assurances_proposees']);

                $avant = null;
                if ($verrouille->type === TypeReleve::Creation) {
                    $fiche = $this->fiches->creer($champs, $verrouille->lat(), $verrouille->lng(), $verrouille->ville_id);
                } else {
                    $avant = $verrouille->pharmacie_id !== null ? $this->fiches->parId($verrouille->pharmacie_id) : null;
                    if ($avant === null) {
                        throw new DonneesInvalides('', ['pharmacie' => ['La pharmacie de ce relevé n\'existe plus.']]);
                    }
                    // La position relevée sur place (30 m de précision au plus) remplace celle de la fiche.
                    $fiche = $this->fiches->mettreAJour($avant->id, $champs, $verrouille->lat(), $verrouille->lng());
                }

                if ($propositions !== []) {
                    $this->fiches->proposerAssurances($verrouille->ville_id, $fiche->id, array_values($propositions), $verrouille->agent_id, $verrouille->id);
                }

                $cheminPublic = $this->photos->publier($facade, $fiche->idPublic);
                $anciennePhoto = $this->fiches->definirPhotoFacade($fiche->id, $cheminPublic);
                $facade->update(['publiee' => true, 'chemin_public' => $cheminPublic]);

                $verrouille->update([
                    'type' => $verrouille->type,
                    'statut' => StatutReleve::Valide,
                    'pharmacie_id' => $fiche->id,
                    'corrections' => $corrections !== [] ? $corrections : null,
                    'fiche_avant' => $avant?->enTableau(),
                    'traite_par' => $auteur->idInterne(),
                    'traite_le' => now(),
                ]);

                return $verrouille;
            });
        } catch (Throwable $e) {
            if ($cheminPublic !== null) {
                $this->photos->supprimerPublic($cheminPublic);
            }
            if (! $e instanceof ExceptionMetier) {
                Log::error('Validation de relevé annulée', ['releve' => $releve->id_public, 'erreur' => $e->getMessage()]);
            }

            throw $e;
        }

        // Après validation de la transaction seulement : l'ancienne photo publique n'est plus référencée.
        if ($anciennePhoto !== null) {
            $this->photos->supprimerPublic($anciennePhoto);
        }
        $fichePubliee = $valide->pharmacie_id !== null ? $this->fiches->parId($valide->pharmacie_id) : null;
        $this->prevenirAppareil($valide, true, $fichePubliee?->idPublic, $fichePubliee?->nom);

        return $valide->load(['photos', 'agent', 'traitePar', 'ville']);
    }

    public function demanderCorrection(Releve $releve, CompteAvecRole $auteur, string $commentaire): Releve
    {
        if ($releve->estPublic()) {
            // L'usager n'a pas d'écran pour corriger : l'équipe complète elle-même, ou rejette.
            throw new ReleveNonModifiable('Une proposition d\'usager ne peut pas être renvoyée : validez-la avec vos corrections ou rejetez-la.');
        }

        return $this->changerStatut($releve, $auteur, StatutReleve::ACorriger, $commentaire, [StatutReleve::Envoye]);
    }

    public function rejeter(Releve $releve, CompteAvecRole $auteur, string $raison): Releve
    {
        $rejete = $this->changerStatut($releve, $auteur, StatutReleve::Rejete, $raison, [StatutReleve::Envoye, StatutReleve::ACorriger]);
        $this->prevenirAppareil($rejete, false, null, null);

        return $rejete;
    }

    /** Proposition d'usager traitée : l'événement part après la transaction (Notifications envoie le push). */
    private function prevenirAppareil(Releve $releve, bool $acceptee, ?string $pharmacieIdPublic, ?string $nomPublie): void
    {
        if (! $releve->estPublic() || $releve->appareil_id === null) {
            return;
        }

        event(new PropositionTraitee(
            $releve->appareil_id,
            $releve->id_public,
            $acceptee,
            $nomPublie ?? (string) ($releve->champsRetenus()['nom'] ?? 'Votre pharmacie'),
            $acceptee ? $pharmacieIdPublic : null,
        ));
    }

    /** @param list<StatutReleve> $depuis */
    private function changerStatut(Releve $releve, CompteAvecRole $auteur, StatutReleve $statut, string $commentaire, array $depuis): Releve
    {
        return DB::transaction(function () use ($releve, $auteur, $statut, $commentaire, $depuis): Releve {
            /** @var Releve $verrouille */
            $verrouille = Releve::query()->whereKey($releve->id)->lockForUpdate()->firstOrFail();
            if (! in_array($verrouille->statut, $depuis, true)) {
                throw new ReleveNonModifiable('Ce relevé a déjà été traité.');
            }
            $verrouille->update([
                'statut' => $statut,
                'commentaire' => $commentaire,
                'traite_par' => $auteur->idInterne(),
                'traite_le' => now(),
            ]);

            return $verrouille->load(['photos', 'agent', 'traitePar', 'ville']);
        });
    }
}
