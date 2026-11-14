<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\CompteAvecRole;
use App\Modules\Pharmacies\Enums\OrigineTelephone;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Pharmacies\Models\TelephonePharmacie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Seule écriture des numéros d'une pharmacie (table telephones_pharmacie). Après chaque changement,
 * pharmacies.telephone reçoit le numéro principal et pharmacies.whatsapp le premier numéro WhatsApp :
 * l'app et le back-office continuent de lire ces deux colonnes.
 */
final class TelephonesPharmacie
{
    /**
     * Ajoute à la suite les numéros que la fiche n'a pas encore. Rien n'est retiré et le principal ne change pas
     * (sur une fiche sans numéro, le premier ajouté devient le principal).
     *
     * @param  list<string>  $numeros  E.164
     * @return list<string> numéros réellement ajoutés
     */
    public function ajouter(Pharmacie $pharmacie, array $numeros, OrigineTelephone $origine): array
    {
        return DB::transaction(function () use ($pharmacie, $numeros, $origine): array {
            $connus = $pharmacie->telephones()->pluck('numero')->all();
            $rang = (int) $pharmacie->telephones()->max('rang');
            $ajoutes = [];
            foreach (array_unique($numeros) as $numero) {
                if (in_array($numero, $connus, true)) {
                    continue;
                }
                $pharmacie->telephones()->create(['numero' => $numero, 'rang' => ++$rang, 'origine' => $origine]);
                $connus[] = $ajoutes[] = $numero;
            }
            if ($ajoutes !== []) {
                $this->synchroniser($pharmacie);
            }

            return $ajoutes;
        });
    }

    /**
     * Numéro donné pour WhatsApp par une source qu'on ne vérifie pas (import) : ajouté s'il manque, marqué
     * WhatsApp sans confirmation. Une réponse déjà donnée par une personne (oui ou non) n'est pas remise en cause.
     *
     * @return bool vrai si la fiche a changé
     */
    public function ajouterWhatsapp(Pharmacie $pharmacie, string $numero, OrigineTelephone $origine): bool
    {
        return DB::transaction(function () use ($pharmacie, $numero, $origine): bool {
            $ajoute = $this->ajouter($pharmacie, [$numero], $origine) !== [];
            $ligne = $this->ligne($pharmacie, $numero);
            if ($ligne->whatsapp || $ligne->whatsapp_confirme_le !== null) {
                return $ajoute;
            }
            $ligne->update(['whatsapp' => true]);
            $this->synchroniser($pharmacie);

            return true;
        });
    }

    /** Le numéro passe au rang 1 (ajouté s'il manque) ; les autres gardent leur ordre derrière lui. */
    public function definirPrincipal(Pharmacie $pharmacie, string $numero, OrigineTelephone $origine): void
    {
        DB::transaction(function () use ($pharmacie, $numero, $origine): void {
            $this->ajouter($pharmacie, [$numero], $origine);
            $ordre = $pharmacie->telephones()->get()->sortBy(fn (TelephonePharmacie $t): int => $t->numero === $numero ? 0 : $t->rang);
            $this->renumeroter($ordre->values()->all());
            $this->synchroniser($pharmacie);
        });
    }

    /**
     * Réponse d'une personne à « ce numéro a-t-il WhatsApp ? » : avec son compte, la réponse est datée
     * et signée (whatsapp_confirme_le vaut aussi pour un « non ») ; sans compte, elle reste à confirmer.
     */
    public function marquerWhatsapp(Pharmacie $pharmacie, string $numero, bool $whatsapp, ?CompteAvecRole $par = null): void
    {
        DB::transaction(function () use ($pharmacie, $numero, $whatsapp, $par): void {
            $this->ligne($pharmacie, $numero)->update([
                'whatsapp' => $whatsapp,
                'whatsapp_confirme_le' => $par !== null ? now() : null,
                'whatsapp_confirme_par' => $par?->idInterne(),
            ]);
            $this->synchroniser($pharmacie);
        });
    }

    /**
     * Numéro donné par une personne connectée (agent sur place, équipe). Déjà sur la fiche, il n'est pas recréé :
     * un renvoi de l'app après une coupure retrouve la même ligne. Les réponses WhatsApp et principal s'appliquent
     * dans les deux cas, comme pour modifier().
     *
     * @return array{telephone: TelephonePharmacie, cree: bool}
     */
    public function enregistrer(Pharmacie $pharmacie, string $numero, ?bool $whatsapp, bool $principal, CompteAvecRole $par, OrigineTelephone $origine): array
    {
        return DB::transaction(function () use ($pharmacie, $numero, $whatsapp, $principal, $par, $origine): array {
            // Deux envois simultanés du même numéro se suivent au lieu de buter sur l'index unique.
            Pharmacie::query()->whereKey($pharmacie->id)->lockForUpdate()->first();
            $cree = $this->ajouter($pharmacie, [$numero], $origine) !== [];
            $telephone = $this->modifier($pharmacie, $this->ligne($pharmacie, $numero), $whatsapp, $principal, $par, $origine);
            if ($cree) {
                Log::info('Numéro de pharmacie ajouté', [
                    'pharmacie' => $pharmacie->id_public, 'telephone' => $telephone->id_public,
                    'origine' => $origine->value, 'compte_id' => $par->idInterne(),
                ]);
            }

            return ['telephone' => $telephone, 'cree' => $cree];
        });
    }

    /**
     * WhatsApp oui ou non (null : pas de réponse) et passage au rang 1. Rejouer la même réponse ne change que
     * la date de confirmation : la dernière visite fait foi. Retirer le seul WhatsApp est permis, la fiche
     * n'a alors plus de numéro WhatsApp (pharmacies.whatsapp à null).
     */
    public function modifier(Pharmacie $pharmacie, TelephonePharmacie $telephone, ?bool $whatsapp, bool $principal, CompteAvecRole $par, OrigineTelephone $origine): TelephonePharmacie
    {
        DB::transaction(function () use ($pharmacie, $telephone, $whatsapp, $principal, $par, $origine): void {
            if ($whatsapp !== null) {
                $this->marquerWhatsapp($pharmacie, $telephone->numero, $whatsapp, $par);
            }
            if ($principal && $telephone->rang !== 1) {
                $this->definirPrincipal($pharmacie, $telephone->numero, $origine);
            }
        });
        if ($whatsapp !== null || $principal) {
            Log::info('Numéro de pharmacie confirmé', [
                'pharmacie' => $pharmacie->id_public, 'telephone' => $telephone->id_public,
                'whatsapp' => $whatsapp, 'principal' => $principal, 'compte_id' => $par->idInterne(),
            ]);
        }

        return $telephone->refresh();
    }

    /**
     * Numéro faux ou qui n'existe plus. Le principal ne part qu'en dernier : il faut d'abord en choisir un autre,
     * pour que le bouton « Appeler » ne bascule pas sur un numéro que personne n'a choisi.
     */
    public function retirer(Pharmacie $pharmacie, TelephonePharmacie $telephone, CompteAvecRole $par): void
    {
        DB::transaction(function () use ($pharmacie, $telephone): void {
            Pharmacie::query()->whereKey($pharmacie->id)->lockForUpdate()->first();
            $telephones = $pharmacie->telephones()->get();
            if ($telephone->rang === 1 && $telephones->count() > 1) {
                throw new DonneesInvalides('Ce numéro est le principal. Choisissez d\'abord un autre numéro principal, puis retirez celui-ci.');
            }
            $telephone->delete();
            $this->renumeroter($telephones->reject(fn (TelephonePharmacie $t): bool => $t->id === $telephone->id)->values()->all());
            $this->synchroniser($pharmacie);
        });
        Log::info('Numéro de pharmacie retiré', [
            'pharmacie' => $pharmacie->id_public, 'telephone' => $telephone->id_public, 'compte_id' => $par->idInterne(),
        ]);
    }

    /**
     * Champs « telephone » et « whatsapp » des formulaires à un seul numéro (fiche admin, espace pharmacien,
     * relevé terrain). Une valeur égale à la colonne actuelle ne change rien : le back-office renvoie les deux
     * champs à chaque enregistrement.
     *  - telephone : ce numéro devient le principal ; vidé, l'ancien principal est retiré et le suivant le remplace ;
     *  - whatsapp : ce numéro devient le seul marqué WhatsApp (non confirmé) ; vidé, plus aucun ne l'est.
     *
     * @param  array<string, mixed>  $champs
     */
    public function appliquerSaisie(Pharmacie $pharmacie, array $champs, OrigineTelephone $origine): void
    {
        $telephone = array_key_exists('telephone', $champs) ? self::valeur($champs['telephone']) : false;
        $whatsapp = array_key_exists('whatsapp', $champs) ? self::valeur($champs['whatsapp']) : false;

        DB::transaction(function () use ($pharmacie, $telephone, $whatsapp, $origine): void {
            if ($telephone !== false && $telephone !== $pharmacie->telephone) {
                if ($telephone === null) {
                    $this->retirerPrincipal($pharmacie);
                } else {
                    $this->definirPrincipal($pharmacie, $telephone, $origine);
                }
            }
            if ($whatsapp !== false && $whatsapp !== $pharmacie->whatsapp) {
                $pharmacie->telephones()->where('whatsapp', true)
                    ->update(['whatsapp' => false, 'whatsapp_confirme_le' => null, 'whatsapp_confirme_par' => null]);
                if ($whatsapp !== null) {
                    $this->ajouter($pharmacie, [$whatsapp], $origine);
                    $this->ligne($pharmacie, $whatsapp)->update(['whatsapp' => true]);
                }
                $this->synchroniser($pharmacie);
            }
        });
    }

    private function retirerPrincipal(Pharmacie $pharmacie): void
    {
        $telephones = $pharmacie->telephones()->get();
        $telephones->first()?->delete();
        $this->renumeroter($telephones->slice(1)->values()->all());
        $this->synchroniser($pharmacie);
    }

    /** @param list<TelephonePharmacie> $telephones dans le nouvel ordre */
    private function renumeroter(array $telephones): void
    {
        foreach ($telephones as $index => $telephone) {
            if ($telephone->rang !== $index + 1) {
                $telephone->update(['rang' => $index + 1]);
            }
        }
    }

    private function synchroniser(Pharmacie $pharmacie): void
    {
        $telephones = $pharmacie->telephones()->get();
        $pharmacie->update([
            'telephone' => $telephones->first()?->numero,
            'whatsapp' => $telephones->firstWhere('whatsapp', true)?->numero,
        ]);
        $pharmacie->setRelation('telephones', $telephones);
    }

    private function ligne(Pharmacie $pharmacie, string $numero): TelephonePharmacie
    {
        return $pharmacie->telephones()->where('numero', $numero)->first()
            ?? throw new DonneesInvalides('', ['numero' => ["Le numéro {$numero} n'est pas sur la fiche."]]);
    }

    private static function valeur(mixed $champ): ?string
    {
        $numero = trim((string) $champ);

        return $numero !== '' ? $numero : null;
    }
}
