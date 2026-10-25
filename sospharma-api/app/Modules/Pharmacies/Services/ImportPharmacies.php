<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Support\LecteurCsv;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Pharmacies\Models\Pharmacie;
use App\Modules\Territoire\Models\Ville;
use App\Modules\Territoire\Models\Zone;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Throwable;

/**
 * Import initial en masse (CSV). Colonnes : nom;adresse;latitude;longitude
 * et facultatives quartier;telephone;whatsapp;h24;services;assurances;zone (services et assurances séparés par « | »).
 * La colonne assurances contient les slugs du référentiel du pays (cmu|mugef-ci) ; un slug inconnu est une erreur.
 * Tout ou rien : la moindre ligne en erreur annule l'import et renvoie les erreurs ligne par ligne.
 */
final class ImportPharmacies
{
    public const COLONNES = ['nom', 'adresse', 'latitude', 'longitude'];

    public function __construct(private readonly GestionPharmacies $gestion) {}

    /** @return array{creees: int} */
    public function importer(Ville $ville, UploadedFile $fichier): array
    {
        $lignes = LecteurCsv::lire($fichier, self::COLONNES);
        $assurances = Assurance::query()->actives()->where('pays_id', $ville->pays_id)->pluck('id', 'slug');
        $zones = Zone::query()->where('ville_id', $ville->id)->get(['id', 'id_public', 'nom'])
            ->flatMap(fn (Zone $z) => [$z->id_public => $z->id_public, mb_strtolower($z->nom) => $z->id_public]);

        $erreurs = [];
        $aCreer = [];
        foreach ($lignes as ['ligne' => $numero, 'valeurs' => $v]) {
            $donnees = [
                'nom' => $v['nom'],
                'adresse' => $v['adresse'],
                'quartier' => ($v['quartier'] ?? '') ?: null,
                'telephone' => ($v['telephone'] ?? '') ?: null,
                'whatsapp' => ($v['whatsapp'] ?? '') ?: null,
                'latitude' => str_replace(',', '.', $v['latitude']),
                'longitude' => str_replace(',', '.', $v['longitude']),
                'h24' => in_array(mb_strtolower($v['h24'] ?? ''), ['1', 'oui', 'true', 'vrai'], true),
                'services' => self::liste($v['services'] ?? ''),
            ];
            $slugs = array_map('mb_strtolower', self::liste($v['assurances'] ?? ''));
            $validation = Validator::make($donnees, [
                'nom' => ['required', 'string', 'max:150'],
                'adresse' => ['required', 'string', 'max:255'],
                'quartier' => ['nullable', 'string', 'max:100'],
                'telephone' => ['nullable', 'regex:/^\+\d{8,15}$/'],
                'whatsapp' => ['nullable', 'regex:/^\+\d{8,15}$/'],
                'latitude' => ['required', 'numeric', 'between:-90,90'],
                'longitude' => ['required', 'numeric', 'between:-180,180'],
            ]);
            $messages = $validation->errors()->all();

            $zone = trim($v['zone'] ?? '');
            if ($zone !== '') {
                $idZone = $zones[$zone] ?? $zones[mb_strtolower($zone)] ?? null;
                if ($idZone === null) {
                    $messages[] = "Zone inconnue dans {$ville->nom} : {$zone}.";
                } else {
                    $donnees['zone'] = $idZone;
                }
            }

            $assuranceIds = [];
            foreach ($slugs as $slug) {
                $idAssurance = $assurances->get($slug);
                if ($idAssurance === null) {
                    $messages[] = "Assurance inconnue dans le référentiel du pays : {$slug}.";
                } else {
                    $assuranceIds[(int) $idAssurance] = ['tiers_payant' => false];
                }
            }

            if ($messages !== []) {
                $erreurs['ligne_'.$numero] = $messages;

                continue;
            }
            $aCreer[] = ['donnees' => $donnees + ['ville' => $ville->id_public], 'assurances' => $assuranceIds];
        }

        if ($erreurs !== []) {
            throw new DonneesInvalides('Le fichier contient '.count($erreurs).' ligne(s) en erreur : rien n\'a été importé.', $erreurs);
        }

        try {
            return DB::transaction(function () use ($aCreer): array {
                foreach ($aCreer as ['donnees' => $donnees, 'assurances' => $assuranceIds]) {
                    $localisation = $this->gestion->localiser($donnees, null);
                    unset($donnees['ville'], $donnees['zone']);
                    $pharmacie = Pharmacie::query()->create($donnees + $localisation);
                    if ($assuranceIds !== []) {
                        $pharmacie->assurances()->sync($assuranceIds);
                    }
                }

                return ['creees' => count($aCreer)];
            });
        } catch (Throwable $e) {
            Log::error('Import de pharmacies annulé', ['ville' => $ville->id_public, 'erreur' => $e->getMessage()]);

            throw $e;
        }
    }

    /** @return list<string> */
    private static function liste(string $valeur): array
    {
        return array_values(array_filter(array_map('trim', explode('|', $valeur)), fn (string $s): bool => $s !== ''));
    }
}
