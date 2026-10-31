<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Modules\Pharmacies\Models\Pharmacie;

/** Une entrée de la liste de garde et la fiche de l'annuaire qui lui correspond (ou pas). */
final class PharmacieRapprochee
{
    /** Même numéro de téléphone, ou même nom dans la même ville : rien à relire. */
    public const TROUVEE = 'trouvee';

    /** Nom approchant, plusieurs fiches possibles ou autre ville : à confirmer à la main. */
    public const A_VERIFIER = 'a_verifier';

    /** Aucune fiche : sera créée avec « Position à confirmer ». */
    public const INCONNUE = 'inconnue';

    public const VILLE_INCONNUE = 'ville_inconnue';

    public const AUTRE_VILLE = 'autre_ville';

    public const TELEPHONE_CORRIGE = 'telephone_corrige';

    public const TELEPHONE_ILLISIBLE = 'telephone_illisible';

    public const SANS_TELEPHONE = 'sans_telephone';

    /** La fiche n'a pas de numéro : celui de la liste peut la compléter. */
    public const TELEPHONE_A_AJOUTER = 'telephone_a_ajouter';

    /** La fiche a un autre numéro que ceux de la liste : ne pas écraser sans accord. */
    public const TELEPHONE_DIFFERENT = 'telephone_different';

    /** @param list<string> $alertes */
    public function __construct(
        public readonly EntreeListeGarde $entree,
        public readonly string $statut,
        public readonly ?Pharmacie $pharmacie,
        public readonly ?int $villeId,
        public readonly ?int $zoneId,
        public readonly ?string $methode,
        public readonly array $alertes,
    ) {}

    /** Décision par défaut : rattacher ce qui est trouvé, créer l'inconnue d'une ville connue, laisser le reste à trancher. */
    public function actionProposee(): string
    {
        return match (true) {
            $this->statut === self::TROUVEE => ImportListeGarde::RATTACHER,
            $this->statut === self::INCONNUE && $this->villeId !== null => ImportListeGarde::CREER,
            default => ImportListeGarde::IGNORER,
        };
    }

    /** @return array<string, mixed> */
    public function versTableau(): array
    {
        return [
            'statut' => $this->statut,
            'action_proposee' => $this->actionProposee(),
            'methode' => $this->methode,
            'alertes' => $this->alertes,
            'pharmacie' => $this->pharmacie === null ? null : [
                'id' => $this->pharmacie->id_public,
                'nom' => $this->pharmacie->nom,
                'telephone' => $this->pharmacie->telephone,
            ],
            'liste' => $this->entree->versTableau(),
        ];
    }
}
