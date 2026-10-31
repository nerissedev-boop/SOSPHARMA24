<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Services;

use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Enums\TypeZone;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

/**
 * Retrouve dans l'annuaire chaque pharmacie de la liste de garde, sans rien écrire :
 *  1. même numéro de téléphone (fiche ou WhatsApp) : trouvée ;
 *  2. même nom (sans « pharmacie », « nouvelle », articles…) dans la ville ou la commune : trouvée ;
 *  3. nom approchant (fautes de lecture, « St » pour « Saint », nom plus long) : à vérifier ;
 *  4. sinon : inconnue.
 * La ville vient de l'en-tête de section de la liste : nom d'une ville ou d'une commune en base.
 */
final class RapprochementListeGarde
{
    /** En deçà, deux noms ne désignent pas la même officine. */
    private const SEUIL_APPROCHANT = 0.75;

    private const MOTS_VIDES = [
        'pharmacie', 'pharma', 'phcie', 'hcie', 'pcie', 'grande', 'la', 'le', 'les', 'de', 'du', 'des', 'l', 'd',
        'et', 'nouvelle', 'nvlle', 'nlle', 'sarl', 'u', 'sa',
    ];

    /** @var array<string, array{ville: int, zone: int|null}>|null */
    private ?array $sections = null;

    /** @var array<string, Collection<int, Pharmacie>> */
    private array $candidats = [];

    public function __construct(private readonly LectureListeGarde $lecture) {}

    /** @return array{0: ListeGardeLue, 1: list<PharmacieRapprochee>} */
    public function analyser(string $texte): array
    {
        $liste = $this->lecture->lire($texte, $this->nomsDesSections());

        return [$liste, array_map(fn (EntreeListeGarde $e): PharmacieRapprochee => $this->rapprocher($e), $liste->entrees)];
    }

    /** @return list<string> */
    public function nomsDesSections(): array
    {
        return array_keys($this->sections());
    }

    public function rapprocher(EntreeListeGarde $entree): PharmacieRapprochee
    {
        $alertes = [];
        if ($entree->telephonesCorriges) {
            $alertes[] = PharmacieRapprochee::TELEPHONE_CORRIGE;
        }
        if ($entree->telephonesInvalides !== []) {
            $alertes[] = PharmacieRapprochee::TELEPHONE_ILLISIBLE;
        }
        if ($entree->telephones === []) {
            $alertes[] = PharmacieRapprochee::SANS_TELEPHONE;
        }

        $section = $entree->section !== null ? ($this->sections()[LectureListeGarde::cle($entree->section)] ?? null) : null;
        if ($section === null) {
            $alertes[] = PharmacieRapprochee::VILLE_INCONNUE;
        }

        [$statut, $pharmacie, $methode] = $this->chercher($entree, $section);
        if ($pharmacie !== null && $section !== null && $pharmacie->ville_id !== $section['ville']) {
            $alertes[] = PharmacieRapprochee::AUTRE_VILLE;
            $statut = PharmacieRapprochee::A_VERIFIER;
        }
        if ($pharmacie !== null && $entree->telephones !== []) {
            $connus = array_filter([$this->dixChiffres($pharmacie->telephone), $this->dixChiffres($pharmacie->whatsapp)]);
            if ($connus === []) {
                $alertes[] = PharmacieRapprochee::TELEPHONE_A_AJOUTER;
            } elseif (array_intersect($connus, $entree->telephones) === []) {
                $alertes[] = PharmacieRapprochee::TELEPHONE_DIFFERENT;
            }
        }

        return new PharmacieRapprochee($entree, $statut, $pharmacie, $pharmacie->ville_id ?? $section['ville'] ?? null, $pharmacie !== null ? $pharmacie->zone_id : ($section['zone'] ?? null), $methode, $alertes);
    }

    /**
     * @param  array{ville: int, zone: int|null}|null  $section
     * @return array{0: string, 1: Pharmacie|null, 2: string|null}
     */
    private function chercher(EntreeListeGarde $entree, ?array $section): array
    {
        // Le téléphone désigne une officine sans ambiguïté, même si la section n'est pas reconnue.
        $parTelephone = $this->parTelephone($entree->telephones);
        if ($parTelephone !== null) {
            return [PharmacieRapprochee::TROUVEE, $parTelephone, 'telephone'];
        }
        if ($section === null) {
            return [PharmacieRapprochee::INCONNUE, null, null];
        }

        // La commune d'abord ; une officine rangée dans la commune voisine reste à vérifier.
        $portees = $section['zone'] !== null ? [['zone', $section['zone']], ['ville', $section['ville']]] : [['ville', $section['ville']]];
        $cle = $this->cleNom($entree->nom);
        foreach ($portees as $rang => [$type, $id]) {
            $candidats = $this->candidats($type, $id);
            $exactes = $cle === '' ? collect() : $candidats->filter(fn (Pharmacie $p): bool => $this->cleNom($p->nom) === $cle);
            if ($exactes->count() === 1) {
                return [$rang === 0 ? PharmacieRapprochee::TROUVEE : PharmacieRapprochee::A_VERIFIER, $exactes->first(), 'nom'];
            }
            if ($exactes->count() > 1) {
                return [PharmacieRapprochee::A_VERIFIER, $exactes->first(), 'nom'];
            }

            $meilleure = null;
            $meilleurScore = 0.0;
            foreach ($candidats as $p) {
                $score = $this->ressemblance($cle, $this->cleNom($p->nom));
                if ($score > $meilleurScore) {
                    [$meilleure, $meilleurScore] = [$p, $score];
                }
            }
            if ($meilleure !== null && $meilleurScore >= self::SEUIL_APPROCHANT) {
                return [PharmacieRapprochee::A_VERIFIER, $meilleure, 'nom_approchant'];
            }
        }

        return [PharmacieRapprochee::INCONNUE, null, null];
    }

    /** @param list<string> $numeros */
    private function parTelephone(array $numeros): ?Pharmacie
    {
        foreach ($numeros as $numero) {
            $trouvees = Pharmacie::query()->actives()
                ->where(fn ($r) => $r->where('telephone', 'like', '%'.$numero)->orWhere('whatsapp', 'like', '%'.$numero))
                ->limit(2)
                ->get();
            // Un numéro partagé par deux fiches (groupement, standard) ne tranche rien.
            if ($trouvees->count() === 1) {
                return $trouvees->first();
            }
        }

        return null;
    }

    /** @return Collection<int, Pharmacie> */
    private function candidats(string $type, int $id): Collection
    {
        return $this->candidats[$type.$id] ??= Pharmacie::query()->actives()
            ->where($type === 'zone' ? 'zone_id' : 'ville_id', $id)
            ->get(['id', 'id_public', 'nom', 'ville_id', 'zone_id', 'telephone', 'whatsapp', 'latitude', 'longitude']);
    }

    /** @return array<string, array{ville: int, zone: int|null}> clé de nom → ville (et commune) */
    private function sections(): array
    {
        if ($this->sections !== null) {
            return $this->sections;
        }
        $sections = [];
        foreach (Ville::query()->where('actif', true)->get(['id', 'nom']) as $ville) {
            $sections[LectureListeGarde::cle($ville->nom)] = ['ville' => $ville->id, 'zone' => null];
        }
        foreach (Zone::query()->where('actif', true)->where('type', TypeZone::Commune->value)->get(['id', 'nom', 'ville_id']) as $zone) {
            // Une ville et une commune homonymes : la ville garde la priorité.
            $sections[LectureListeGarde::cle($zone->nom)] ??= ['ville' => $zone->ville_id, 'zone' => $zone->id];
        }

        return $this->sections = $sections;
    }

    /** « Pharmacie St Pierre Nimbo (Nouvelle) » → « saint pierre nimbo » */
    private function cleNom(string $nom): string
    {
        $mots = preg_split('/[^a-z0-9]+/', Str::lower(Str::ascii($nom)), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $mots = array_map(fn (string $m): string => $m === 'st' ? 'saint' : ($m === 'ste' ? 'sainte' : $m), $mots);

        return implode(' ', array_values(array_diff($mots, self::MOTS_VIDES)));
    }

    /** Entre 0 et 1 : distance d'édition, et 0,8 si tous les mots de l'un sont dans l'autre. */
    private function ressemblance(string $a, string $b): float
    {
        if ($a === '' || $b === '') {
            return 0.0;
        }
        $score = 1 - levenshtein($a, $b) / max(strlen($a), strlen($b));
        $motsA = explode(' ', $a);
        $motsB = explode(' ', $b);
        if (array_diff($motsA, $motsB) === [] || array_diff($motsB, $motsA) === []) {
            $score = max($score, 0.8);
        }

        return $score;
    }

    private function dixChiffres(?string $telephone): ?string
    {
        $chiffres = preg_replace('/\D/', '', (string) $telephone) ?? '';

        return strlen($chiffres) >= 10 ? substr($chiffres, -10) : null;
    }
}
