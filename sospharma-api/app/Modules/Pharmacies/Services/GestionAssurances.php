<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Commun\Erreurs\DonneesInvalides;
use App\Modules\Pharmacies\Enums\TypeAssurance;
use App\Modules\Pharmacies\Models\Assurance;
use App\Modules\Territoire\Models\Pays;
use Illuminate\Support\Str;

/** Référentiel des assurances d'un pays (admin). */
final class GestionAssurances
{
    /** @param array{pays: string, nom: string, slug?: string|null, type: string, logo?: string|null, actif?: bool} $donnees */
    public function creer(array $donnees): Assurance
    {
        $pays = Pays::query()->where('code', $donnees['pays'])->firstOrFail();
        $slug = self::slug($donnees['slug'] ?? null, $donnees['nom']);
        $this->verifierSlugLibre($pays->id, $slug);

        return Assurance::query()->create([
            'pays_id' => $pays->id,
            'nom' => trim($donnees['nom']),
            'slug' => $slug,
            'type' => TypeAssurance::from($donnees['type']),
            'logo' => $donnees['logo'] ?? null,
            'actif' => $donnees['actif'] ?? true,
        ])->load('pays');
    }

    /** @param array{nom?: string, slug?: string|null, type?: string, logo?: string|null, actif?: bool} $donnees */
    public function modifier(Assurance $assurance, array $donnees): Assurance
    {
        $attributs = array_intersect_key($donnees, array_flip(['nom', 'logo', 'actif']));
        if (isset($attributs['nom'])) {
            $attributs['nom'] = trim($attributs['nom']);
        }
        if (isset($donnees['type'])) {
            $attributs['type'] = TypeAssurance::from($donnees['type']);
        }
        // Le slug ne change que s'il est demandé : il sert de clé stable aux filtres de l'app.
        if (! empty($donnees['slug'])) {
            $slug = self::slug($donnees['slug'], $assurance->nom);
            if ($slug !== $assurance->slug) {
                $this->verifierSlugLibre($assurance->pays_id, $slug, $assurance->id);
                $attributs['slug'] = $slug;
            }
        }
        $assurance->update($attributs);

        return $assurance->load('pays');
    }

    /** DELETE : désactivation. Les liens restent, mais l'assurance disparaît de l'app et des filtres. */
    public function desactiver(Assurance $assurance): Assurance
    {
        $assurance->update(['actif' => false]);

        return $assurance->load('pays');
    }

    public static function slug(?string $demande, string $nom): string
    {
        $slug = Str::slug($demande !== null && $demande !== '' ? $demande : $nom);
        if ($slug === '') {
            throw new DonneesInvalides('', ['slug' => ['Impossible de déduire un identifiant court de ce nom : précisez le slug.']]);
        }

        return mb_substr($slug, 0, 80);
    }

    private function verifierSlugLibre(int $paysId, string $slug, ?int $sauf = null): void
    {
        $pris = Assurance::query()->where('pays_id', $paysId)->where('slug', $slug)
            ->when($sauf !== null, fn ($r) => $r->whereKeyNot($sauf))
            ->exists();
        if ($pris) {
            throw new DonneesInvalides('', ['slug' => ["Le slug « {$slug} » est déjà utilisé dans ce pays."]]);
        }
    }
}
