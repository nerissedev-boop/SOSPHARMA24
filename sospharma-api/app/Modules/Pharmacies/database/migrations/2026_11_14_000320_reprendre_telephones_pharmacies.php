<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Reprise des colonnes pharmacies.telephone et pharmacies.whatsapp dans telephones_pharmacie :
 * le téléphone devient le rang 1 ; le WhatsApp s'y fusionne s'il est identique, sinon il vient au rang suivant.
 * Les colonnes ne sont pas modifiées. Origine « reprise » : on ne sait plus d'où venait chaque numéro.
 */
return new class extends Migration
{
    public function up(): void
    {
        $maintenant = now();
        DB::table('pharmacies')
            ->where(fn ($r) => $r->whereNotNull('telephone')->orWhereNotNull('whatsapp'))
            ->select(['id', 'telephone', 'whatsapp'])
            ->orderBy('id')
            ->chunk(500, function ($fiches) use ($maintenant): void {
                $lignes = [];
                foreach ($fiches as $fiche) {
                    $telephone = trim((string) $fiche->telephone);
                    $whatsapp = trim((string) $fiche->whatsapp);
                    $ligne = fn (string $numero, int $rang, bool $estWhatsapp): array => [
                        'pharmacie_id' => $fiche->id, 'numero' => $numero, 'rang' => $rang, 'whatsapp' => $estWhatsapp,
                        'origine' => 'reprise', 'created_at' => $maintenant, 'updated_at' => $maintenant,
                    ];
                    if ($telephone !== '') {
                        $lignes[] = $ligne($telephone, 1, $telephone === $whatsapp);
                    }
                    if ($whatsapp !== '' && $whatsapp !== $telephone) {
                        $lignes[] = $ligne($whatsapp, $telephone !== '' ? 2 : 1, true);
                    }
                }
                DB::table('telephones_pharmacie')->insertOrIgnore($lignes);
            });
    }

    public function down(): void
    {
        DB::table('telephones_pharmacie')->where('origine', 'reprise')->delete();
    }
};
