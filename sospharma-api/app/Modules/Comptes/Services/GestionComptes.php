<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Services;

use App\Commun\Contrats\AnnuaireTerritoire;
use App\Commun\Erreurs\ActionInterdite;
use App\Commun\Erreurs\DonneesInvalides;
use App\Commun\Securite\Role;
use App\Modules\Comptes\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;

final class GestionComptes
{
    public function __construct(private readonly AnnuaireTerritoire $territoire) {}

    /**
     * Crée le compte avec un mot de passe aléatoire et envoie un lien pour le choisir.
     *
     * @param  array{nom: string, email: string, role: string, ville?: string|null, villes?: list<string>|null, actif?: bool}  $donnees
     */
    public function inviter(array $donnees): User
    {
        $role = Role::from($donnees['role']);
        $compte = DB::transaction(function () use ($donnees, $role): User {
            $compte = User::query()->create([
                'nom' => $donnees['nom'],
                'email' => mb_strtolower(trim($donnees['email'])),
                'password' => Str::password(32),
                'role' => $role,
                'ville_id' => $this->villePourRole($role, $donnees['ville'] ?? null),
                'actif' => $donnees['actif'] ?? true,
            ]);
            if ($role === Role::AgentTerrain) {
                $compte->synchroniserVilles($this->villesPourAgent($donnees['villes'] ?? null));
            }

            return $compte;
        });

        try {
            Password::broker()->sendResetLink(['email' => $compte->email]);
        } catch (Throwable $e) {
            // Le compte existe : l'invitation pourra être renvoyée par « mot de passe oublié ».
            Log::error('Invitation non envoyée', ['compte' => $compte->id_public, 'erreur' => $e->getMessage()]);
        }

        return $compte;
    }

    /** @param array{nom?: string, email?: string, role?: string, ville?: string|null, villes?: list<string>|null, actif?: bool} $donnees */
    public function modifier(User $compte, array $donnees, User $auteur): User
    {
        if ($compte->is($auteur) && (isset($donnees['role']) || ($donnees['actif'] ?? true) === false)) {
            throw new ActionInterdite('Vous ne pouvez pas changer votre propre rôle ni désactiver votre compte.');
        }

        return DB::transaction(function () use ($compte, $donnees): User {
            $role = isset($donnees['role']) ? Role::from($donnees['role']) : $compte->role;
            $attributs = array_intersect_key($donnees, array_flip(['nom', 'email', 'actif']));
            if (isset($attributs['email'])) {
                $attributs['email'] = mb_strtolower(trim($attributs['email']));
            }
            $attributs['role'] = $role;
            if (array_key_exists('ville', $donnees) || isset($donnees['role'])) {
                $attributs['ville_id'] = $this->villePourRole($role, $donnees['ville'] ?? null, $compte->ville_id);
            }
            $compte->update($attributs);

            if ($role === Role::AgentTerrain && (array_key_exists('villes', $donnees) || isset($donnees['role']))) {
                $villes = $donnees['villes'] ?? null;
                $compte->synchroniserVilles($villes === null && $compte->villesRattachees() !== [] ? $compte->villesRattachees() : $this->villesPourAgent($villes));
            } elseif ($role !== Role::AgentTerrain && isset($donnees['role'])) {
                $compte->synchroniserVilles([]);
            }

            if (! $compte->actif || isset($donnees['role'])) {
                // Nouveaux droits : on force une reconnexion.
                $compte->tokens()->delete();
            }

            return $compte;
        });
    }

    public function desactiver(User $compte, User $auteur): User
    {
        if ($compte->is($auteur)) {
            throw new ActionInterdite('Vous ne pouvez pas désactiver votre propre compte.');
        }

        DB::transaction(function () use ($compte): void {
            $compte->update(['actif' => false]);
            $compte->tokens()->delete();
        });

        return $compte;
    }

    /**
     * @param  list<string>|null  $villesPubliques
     * @return list<int>
     */
    private function villesPourAgent(?array $villesPubliques): array
    {
        if ($villesPubliques === null || $villesPubliques === []) {
            throw new DonneesInvalides('', ['villes' => ['Un agent terrain doit être rattaché à au moins une ville.']]);
        }
        $ids = [];
        foreach ($villesPubliques as $i => $idPublic) {
            $ids[] = $this->territoire->villeIdDepuisPublic($idPublic)
                ?? throw new DonneesInvalides('', ["villes.{$i}" => ['Ville inconnue.']]);
        }

        return $ids;
    }

    private function villePourRole(Role $role, ?string $villePublique, ?int $actuelle = null): ?int
    {
        if ($role !== Role::EditeurVille) {
            return null;
        }
        if ($villePublique === null) {
            if ($actuelle !== null) {
                return $actuelle;
            }

            throw new DonneesInvalides('', ['ville' => ['Un éditeur de ville doit être rattaché à une ville.']]);
        }

        return $this->territoire->villeIdDepuisPublic($villePublique)
            ?? throw new DonneesInvalides('', ['ville' => ['Ville inconnue.']]);
    }
}
