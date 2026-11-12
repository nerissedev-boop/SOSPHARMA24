<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Geo\Distance;
use App\Commun\Support\LecteurCsv;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

/**
 * Remplissage de l'annuaire d'une ville par CSV : la pharmacie existe, on la met à jour ; sinon, on la crée.
 *
 * Seule la colonne `nom` est obligatoire. Facultatives : id;adresse;quartier;commune (ou zone : nom ou identifiant zo_…);telephone;whatsapp;
 * latitude;longitude;h24;services;assurances (services et assurances séparés par « | », assurances en slugs).
 *
 * Fiche existante, dans la ville choisie, cherchée dans cet ordre :
 *  1. colonne `id` (ph_…) ;
 *  2. même téléphone ou WhatsApp (10 derniers chiffres), s'il n'appartient qu'à une fiche ;
 *  3. même nom (sans « pharmacie », accents, etc.), départagé par la commune ou une position à moins de 300 m.
 * Plusieurs fiches possibles : la ligne est « ambiguë » et n'est pas appliquée (ajouter la colonne `id`).
 *
 * Mise à jour : seules les cellules remplies remplacent la fiche (une cellule vide n'efface rien) ;
 * les assurances s'ajoutent à celles déjà connues. Une ligne en erreur est écartée, les autres sont appliquées.
 * `simulation` : même bilan, rien n'est enregistré.
 */
final class ImportPharmacies
{
    public const COLONNES = ['nom'];

    public const CREER = 'creer';

    public const METTRE_A_JOUR = 'mettre_a_jour';

    public const INCHANGEE = 'inchangee';

    public const AMBIGUE = 'ambigue';

    public const ERREUR = 'erreur';

    /** Ligne retirée à la main dans l'aperçu : lue pour l'affichage, jamais appliquée. */
    public const RETIREE = 'retiree';

    public const ADRESSE_INCONNUE = 'Adresse à vérifier';

    private const RAYON_MEME_NOM_M = 300;

    private const MOTS_VIDES = [
        'pharmacie', 'pharma', 'phcie', 'pcie', 'grande', 'la', 'le', 'les', 'de', 'du', 'des', 'l', 'd', 'et', 'nouvelle', 'sarl', 'sa',
    ];

    private const CHAMPS = ['nom', 'adresse', 'quartier', 'telephone', 'whatsapp', 'latitude', 'longitude', 'h24', 'services'];

    /** @var Collection<int, Pharmacie> */
    private Collection $fiches;

    public function __construct(private readonly GestionPharmacies $gestion) {}

    /**
     * @return array{simulation: bool, creees: int, mises_a_jour: int, inchangees: int, ambigues: int, erreurs: int,
     *     lignes: list<array<string, mixed>>}
     */
    /**
     * @param  list<int>  $exclure  numéros de ligne retirés dans l'aperçu
     */
    public function importer(Ville $ville, UploadedFile $fichier, bool $simulation = false, array $exclure = []): array
    {
        $lignes = LecteurCsv::lire($fichier, self::COLONNES);
        $ville->loadMissing('pays');
        $indicatif = (string) ($ville->pays->indicatif ?? '');
        $assurances = Assurance::query()->actives()->where('pays_id', $ville->pays_id)->pluck('id', 'slug');
        $zones = Zone::query()->where('ville_id', $ville->id)->get(['id', 'id_public', 'nom'])
            ->flatMap(fn (Zone $z) => [$z->id_public => $z, mb_strtolower($z->nom) => $z, self::cle($z->nom) => $z]);
        $this->fiches = Pharmacie::query()->where('ville_id', $ville->id)->with(['assurances', 'zone'])->get();

        $plan = [];
        $dejaVues = [];
        $retirees = array_flip($exclure);
        foreach ($lignes as ['ligne' => $numero, 'valeurs' => $v]) {
            if (isset($retirees[$numero])) {
                // Pas de rapprochement : la ligne ne « prend » aucune fiche aux lignes suivantes.
                $plan[] = ['ligne' => $numero, 'nom' => $v['nom'], 'action' => self::RETIREE, 'pharmacie' => null, 'methode' => null, 'changements' => [], 'messages' => ["Retirée avant l'import."]];

                continue;
            }
            $plan[] = $this->planifier($numero, $v, $ville, $indicatif, $assurances->all(), $zones->all(), $dejaVues);
        }

        if (! $simulation) {
            $this->appliquer($plan, $ville);
        }

        $compte = fn (string $action): int => count(array_filter($plan, fn (array $l): bool => $l['action'] === $action));

        return [
            'simulation' => $simulation,
            'creees' => $compte(self::CREER),
            'mises_a_jour' => $compte(self::METTRE_A_JOUR),
            'inchangees' => $compte(self::INCHANGEE),
            'ambigues' => $compte(self::AMBIGUE),
            'erreurs' => $compte(self::ERREUR),
            'retirees' => $compte(self::RETIREE),
            'lignes' => array_map(fn (array $l): array => array_diff_key($l, ['donnees' => 1, 'assurances_ids' => 1, 'fiche' => 1]), $plan),
        ];
    }

    /**
     * @param  array<string, string>  $v
     * @param  array<string, int>  $assurances  slug → id
     * @param  array<string, Zone>  $zones
     * @param  array<int, int>  $dejaVues  id de fiche → ligne qui l'a déjà prise
     * @return array<string, mixed>
     */
    private function planifier(int $numero, array $v, Ville $ville, string $indicatif, array $assurances, array $zones, array &$dejaVues): array
    {
        $ligne = ['ligne' => $numero, 'nom' => $v['nom'], 'action' => self::ERREUR, 'pharmacie' => null, 'methode' => null, 'changements' => [], 'messages' => []];

        $donnees = array_filter([
            'nom' => $v['nom'],
            'adresse' => $v['adresse'] ?? '',
            'quartier' => $v['quartier'] ?? '',
            'telephone' => self::telephone($v['telephone'] ?? '', $indicatif),
            'whatsapp' => self::telephone($v['whatsapp'] ?? '', $indicatif),
            'latitude' => str_replace(',', '.', $v['latitude'] ?? ''),
            'longitude' => str_replace(',', '.', $v['longitude'] ?? ''),
        ], fn (string $s): bool => $s !== '');
        $h24 = mb_strtolower(trim($v['h24'] ?? ''));
        if ($h24 !== '') {
            $donnees['h24'] = in_array($h24, ['1', 'oui', 'true', 'vrai', 'o', 'x'], true);
        }
        $services = self::liste($v['services'] ?? '');
        if ($services !== []) {
            $donnees['services'] = $services;
        }

        $messages = Validator::make($donnees, [
            'nom' => ['required', 'string', 'max:150'],
            'adresse' => ['sometimes', 'string', 'max:255'],
            'quartier' => ['sometimes', 'string', 'max:100'],
            'telephone' => ['sometimes', 'regex:/^\+\d{8,15}$/'],
            'whatsapp' => ['sometimes', 'regex:/^\+\d{8,15}$/'],
            'latitude' => ['sometimes', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required_with:latitude', 'numeric', 'between:-180,180'],
        ], [
            'telephone.regex' => 'Téléphone illisible : '.($v['telephone'] ?? '').'.',
            'whatsapp.regex' => 'WhatsApp illisible : '.($v['whatsapp'] ?? '').'.',
        ])->errors()->all();

        $zone = null;
        $nomZone = trim(($v['commune'] ?? '') !== '' ? $v['commune'] : ($v['zone'] ?? ''));
        if ($nomZone !== '') {
            $zone = $zones[$nomZone] ?? $zones[mb_strtolower($nomZone)] ?? $zones[self::cle($nomZone)] ?? null;
            if ($zone === null) {
                $messages[] = "Commune inconnue dans {$ville->nom} : {$nomZone}.";
            }
        }

        $assurancesIds = [];
        foreach (array_map('mb_strtolower', self::liste($v['assurances'] ?? '')) as $slug) {
            if (! isset($assurances[$slug])) {
                $messages[] = "Assurance inconnue dans le référentiel du pays : {$slug}.";
            } else {
                $assurancesIds[] = (int) $assurances[$slug];
            }
        }

        // Ce qui a été lu dans le fichier, pour l'aperçu de l'écran (téléphones déjà au format +225…).
        $ligne['valeurs'] = [
            'adresse' => $donnees['adresse'] ?? null,
            'quartier' => $donnees['quartier'] ?? null,
            'commune' => $zone?->nom ?? ($nomZone !== '' ? $nomZone : null),
            'telephone' => $donnees['telephone'] ?? null,
            'whatsapp' => $donnees['whatsapp'] ?? null,
            'position' => isset($donnees['latitude'], $donnees['longitude']) ? ['lat' => (float) $donnees['latitude'], 'lng' => (float) $donnees['longitude']] : null,
            'h24' => $donnees['h24'] ?? null,
            'services' => $donnees['services'] ?? [],
            'assurances' => self::liste($v['assurances'] ?? ''),
        ];

        if ($messages !== []) {
            return ['messages' => $messages] + $ligne;
        }

        $lat = isset($donnees['latitude']) ? (float) $donnees['latitude'] : null;
        $lng = isset($donnees['longitude']) ? (float) $donnees['longitude'] : null;
        [$fiche, $methode, $alerte] = $this->chercher(trim($v['id'] ?? ''), $donnees, $zone, $lat, $lng);
        if ($alerte !== null) {
            $ligne['messages'][] = $alerte;
        }

        if ($fiche === false) {
            return ['action' => self::AMBIGUE, 'methode' => $methode] + $ligne;
        }
        if ($fiche === null && $methode === 'id') {
            return ['messages' => ["Aucune fiche {$v['id']} dans {$ville->nom}."]] + $ligne;
        }

        if ($fiche !== null) {
            if (isset($dejaVues[$fiche->id])) {
                return ['messages' => ["Même fiche que la ligne {$dejaVues[$fiche->id]} : ligne écartée."], 'pharmacie' => self::resume($fiche)] + $ligne;
            }
            $dejaVues[$fiche->id] = $numero;
            $changements = $this->changements($fiche, $donnees, $zone, $assurancesIds);
            if (! $fiche->actif) {
                $ligne['messages'][] = 'Fiche désactivée : elle reste masquée dans l\'app.';
            }

            return [
                'action' => $changements === [] ? self::INCHANGEE : self::METTRE_A_JOUR,
                'pharmacie' => self::resume($fiche),
                'methode' => $methode,
                'changements' => $changements,
                'avant' => self::avant($fiche, $changements),
                'fiche' => $fiche,
                // Seuls les champs qui changent sont écrits (la commune n'est recalculée que si elle ou la position bouge).
                'donnees' => array_intersect_key(
                    $donnees + ($zone !== null ? ['zone' => $zone->id_public] : []),
                    array_flip(array_merge($changements, in_array('position', $changements, true) ? ['latitude', 'longitude'] : [])),
                ),
                'assurances_ids' => $assurancesIds,
            ] + $ligne;
        }

        if (! isset($donnees['adresse'])) {
            $ligne['messages'][] = 'Sans adresse : « '.self::ADRESSE_INCONNUE.' ».';
        }
        if ($lat === null) {
            $ligne['messages'][] = 'Sans position : « Position à confirmer » dans l\'app.';
        }

        return [
            'action' => self::CREER,
            'donnees' => $donnees + ['adresse' => self::ADRESSE_INCONNUE] + ($zone !== null ? ['zone' => $zone->id_public] : []),
            'assurances_ids' => $assurancesIds,
        ] + $ligne;
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @return array{0: Pharmacie|null|false, 1: string|null, 2: string|null} [fiche (false = ambiguë), méthode, alerte]
     */
    private function chercher(string $id, array $donnees, ?Zone $zone, ?float $lat, ?float $lng): array
    {
        if ($id !== '') {
            return [$this->fiches->firstWhere('id_public', $id), 'id', null];
        }

        $cle = self::cleNom((string) $donnees['nom']);
        foreach (['telephone', 'whatsapp'] as $champ) {
            $chiffres = self::dixChiffres($donnees[$champ] ?? null);
            if ($chiffres === null) {
                continue;
            }
            $memeNumero = $this->fiches->filter(fn (Pharmacie $p): bool => in_array($chiffres, [self::dixChiffres($p->telephone), self::dixChiffres($p->whatsapp)], true));
            if ($memeNumero->count() === 1) {
                $fiche = $memeNumero->first();
                $alerte = self::cleNom($fiche->nom) !== $cle ? "Trouvée par le téléphone, mais nommée « {$fiche->nom} » dans l'annuaire." : null;

                return [$fiche, 'telephone', $alerte];
            }
        }

        if ($cle === '') {
            return [null, null, null];
        }
        $memeNom = $this->fiches->filter(fn (Pharmacie $p): bool => self::cleNom($p->nom) === $cle);
        if ($zone !== null && $memeNom->count() > 1) {
            $memeNom = $memeNom->filter(fn (Pharmacie $p): bool => (int) $p->zone_id === $zone->id || $p->zone_id === null);
        }
        if ($lat !== null && $lng !== null) {
            $memeNom = $memeNom->filter(fn (Pharmacie $p): bool => ! $p->aUnePosition()
                || Distance::metres($lat, $lng, (float) $p->lat(), (float) $p->lng()) <= self::RAYON_MEME_NOM_M);
        } elseif ($zone !== null) {
            $memeNom = $memeNom->filter(fn (Pharmacie $p): bool => (int) $p->zone_id === $zone->id || $p->zone_id === null);
        }

        return match ($memeNom->count()) {
            0 => [null, null, null],
            1 => [$memeNom->first(), 'nom', null],
            default => [false, 'nom', $memeNom->count().' fiches portent ce nom : '.$memeNom->map(fn (Pharmacie $p): string => $p->id_public)->implode(', ').'. Ajoutez la colonne id.'],
        };
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @param  list<int>  $assurancesIds
     * @return list<string>
     */
    private function changements(Pharmacie $fiche, array $donnees, ?Zone $zone, array $assurancesIds): array
    {
        $changes = [];
        foreach (self::CHAMPS as $champ) {
            if (! array_key_exists($champ, $donnees)) {
                continue;
            }
            $actuel = $fiche->getAttribute($champ);
            $nouveau = $donnees[$champ];
            $different = match ($champ) {
                'latitude', 'longitude' => $actuel === null || abs((float) $actuel - (float) $nouveau) > 0.000001,
                'h24' => (bool) $actuel !== $nouveau,
                'services' => array_values((array) $actuel) !== $nouveau,
                // « Etoile » pour « Pharmacie de l'Étoile » : même pharmacie, on garde le nom de l'annuaire.
                'nom' => self::cleNom((string) $actuel) !== self::cleNom((string) $nouveau),
                // « 12eme » / « 12EME », tiret long / court, point final : même adresse, rien à réécrire.
                'adresse', 'quartier' => self::cle((string) $actuel) !== self::cle((string) $nouveau),
                default => (string) $actuel !== (string) $nouveau,
            };
            if ($different) {
                $changes[] = $champ;
            }
        }
        if ($zone !== null && (int) $fiche->zone_id !== $zone->id) {
            $changes[] = 'zone';
        }
        $connues = $fiche->assurances->pluck('id')->all();
        if (array_diff($assurancesIds, $connues) !== []) {
            $changes[] = 'assurances';
        }

        return array_values(array_unique(array_map(fn (string $c): string => in_array($c, ['latitude', 'longitude'], true) ? 'position' : $c, $changes)));
    }

    /** @param  list<array<string, mixed>>  $plan */
    private function appliquer(array $plan, Ville $ville): void
    {
        try {
            DB::transaction(function () use ($plan, $ville): void {
                foreach ($plan as $l) {
                    if ($l['action'] === self::CREER) {
                        $donnees = $l['donnees'];
                        $localisation = $this->gestion->localiser($donnees + ['ville' => $ville->id_public, 'latitude' => null, 'longitude' => null], null);
                        unset($donnees['zone']);
                        $fiche = Pharmacie::query()->create($donnees + $localisation);
                        $this->ajouterAssurances($fiche, $l['assurances_ids']);
                    } elseif ($l['action'] === self::METTRE_A_JOUR) {
                        /** @var Pharmacie $fiche */
                        $fiche = $l['fiche'];
                        $donnees = $l['donnees'];
                        // Commune recalculée (position ou commune changée) : toujours dans la ville de l'import.
                        // Sans elle, une position tombée dans une commune d'une autre ville y déplacerait la fiche.
                        if (array_intersect(array_keys($donnees), ['zone', 'latitude', 'longitude']) !== []) {
                            $donnees['ville'] = $ville->id_public;
                        }
                        $this->gestion->modifier($fiche, $donnees);
                        $this->ajouterAssurances($fiche, $l['assurances_ids']);
                    }
                }
            });
        } catch (Throwable $e) {
            Log::error('Import de pharmacies annulé', ['ville' => $ville->id_public, 'erreur' => $e->getMessage()]);

            throw $e;
        }
    }

    /** @param  list<int>  $ids */
    private function ajouterAssurances(Pharmacie $fiche, array $ids): void
    {
        if ($ids !== []) {
            $fiche->assurances()->syncWithoutDetaching(array_fill_keys($ids, ['tiers_payant' => false]));
        }
    }

    /**
     * Valeur actuelle de la fiche pour chaque champ qui va changer (aperçu « avant → après »).
     *
     * @param  list<string>  $changements
     * @return array<string, mixed>
     */
    private static function avant(Pharmacie $fiche, array $changements): array
    {
        $avant = [];
        foreach ($changements as $champ) {
            $avant[$champ] = match ($champ) {
                'position' => $fiche->aUnePosition() ? ['lat' => $fiche->lat(), 'lng' => $fiche->lng()] : null,
                'zone' => $fiche->zone?->nom,
                'assurances' => $fiche->assurances->pluck('nom')->values()->all(),
                'h24' => (bool) $fiche->h24,
                'services' => array_values((array) $fiche->services),
                default => $fiche->getAttribute($champ),
            };
        }

        return $avant;
    }

    /** @return array{id: string, nom: string} */
    private static function resume(Pharmacie $p): array
    {
        return ['id' => $p->id_public, 'nom' => $p->nom];
    }

    /** « 07 07 12 34 56 » ou « 0707123456 » → « +2250707123456 » ; déjà au format international : inchangé. */
    private static function telephone(string $brut, string $indicatif): string
    {
        $brut = trim($brut);
        if ($brut === '') {
            return '';
        }
        $chiffres = preg_replace('/\D/', '', $brut) ?? '';
        if (str_starts_with($brut, '+')) {
            return '+'.$chiffres;
        }
        if (str_starts_with($chiffres, '00')) {
            return '+'.substr($chiffres, 2);
        }
        $prefixe = ltrim($indicatif, '+');
        if ($prefixe !== '' && str_starts_with($chiffres, $prefixe) && strlen($chiffres) > 10) {
            return '+'.$chiffres;
        }

        return $prefixe !== '' ? '+'.$prefixe.$chiffres : $brut;
    }

    private static function dixChiffres(?string $telephone): ?string
    {
        $chiffres = preg_replace('/\D/', '', (string) $telephone) ?? '';

        return strlen($chiffres) >= 10 ? substr($chiffres, -10) : null;
    }

    /** « Pharmacie St Pierre (Nouvelle) » → « saint pierre » */
    private static function cleNom(string $nom): string
    {
        $mots = preg_split('/[^a-z0-9]+/', Str::lower(Str::ascii($nom)), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $mots = array_map(fn (string $m): string => $m === 'st' ? 'saint' : ($m === 'ste' ? 'sainte' : $m), $mots);

        return implode(' ', array_values(array_diff($mots, self::MOTS_VIDES)));
    }

    private static function cle(string $nom): string
    {
        return preg_replace('/[^a-z0-9]/', '', Str::lower(Str::ascii($nom))) ?? '';
    }

    /** @return list<string> */
    private static function liste(string $valeur): array
    {
        return array_values(array_filter(array_map('trim', explode('|', $valeur)), fn (string $s): bool => $s !== ''));
    }
}
