<?php

declare(strict_types=1);

namespace App\Modules\Comptes\Models;

use App\Commun\Modeles\AIdentifiantPublic;
use App\Commun\Securite\CompteAvecRole;
use App\Commun\Securite\Role;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\DB;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Compte de l'équipe (admin, éditeur de ville), d'un pharmacien ou d'un agent terrain.
 *
 * @property int $id
 * @property string $id_public
 * @property string $nom
 * @property string $email
 * @property Role $role
 * @property int|null $ville_id
 * @property bool $actif
 * @property \Illuminate\Support\Carbon|null $derniere_connexion_le
 */
class User extends Authenticatable implements CompteAvecRole
{
    use AIdentifiantPublic, HasApiTokens, Notifiable;

    protected const PREFIXE_ID = 'co';

    protected $table = 'users';

    protected $fillable = ['id_public', 'nom', 'email', 'password', 'role', 'ville_id', 'actif'];

    protected $hidden = ['password', 'remember_token'];

    /** @var list<int>|null villes rattachées (agent terrain), lues une fois par instance */
    private ?array $villesRattachees = null;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'derniere_connexion_le' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'actif' => 'boolean',
        ];
    }

    public function idInterne(): int
    {
        return $this->id;
    }

    public function role(): Role
    {
        return $this->role;
    }

    public function villeId(): ?int
    {
        return $this->ville_id;
    }

    public function villesAutorisees(): array
    {
        return match ($this->role) {
            Role::EditeurVille => $this->ville_id !== null ? [$this->ville_id] : [],
            Role::AgentTerrain => $this->villesRattachees(),
            default => [],
        };
    }

    /**
     * Villes rattachées dans compte_villes (agent terrain), identifiants internes.
     *
     * @return list<int>
     */
    public function villesRattachees(): array
    {
        return $this->villesRattachees ??= DB::table('compte_villes')
            ->where('user_id', $this->id)
            ->orderBy('ville_id')
            ->pluck('ville_id')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }

    /** @param list<int> $villeIds remplace toutes les villes rattachées */
    public function synchroniserVilles(array $villeIds): void
    {
        $villeIds = array_values(array_unique(array_map('intval', $villeIds)));
        DB::table('compte_villes')->where('user_id', $this->id)->whereNotIn('ville_id', $villeIds)->delete();
        $existantes = DB::table('compte_villes')->where('user_id', $this->id)->pluck('ville_id')->map(fn ($id): int => (int) $id)->all();
        $maintenant = now();
        $nouvelles = array_map(
            fn (int $villeId): array => ['user_id' => $this->id, 'ville_id' => $villeId, 'created_at' => $maintenant, 'updated_at' => $maintenant],
            array_values(array_diff($villeIds, $existantes)),
        );
        if ($nouvelles !== []) {
            DB::table('compte_villes')->insert($nouvelles);
        }
        $this->villesRattachees = null;
    }

    public function estActif(): bool
    {
        return $this->actif;
    }

    public function estAdmin(): bool
    {
        return $this->role === Role::Admin;
    }
}
