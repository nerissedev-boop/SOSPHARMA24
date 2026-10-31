<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Modules\Gardes\Http\Requests\ListeGardeRequest;
use App\Modules\Gardes\Services\ImportListeGarde;
use App\Modules\Gardes\Services\PharmacieRapprochee;
use App\Modules\Gardes\Services\RapprochementListeGarde;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

/** Liste de garde officielle (toutes villes) : analyse pour l'écran de relecture, puis import en brouillons. */
class AdminListeGardeController extends Controller
{
    public function analyser(ListeGardeRequest $request, RapprochementListeGarde $rapprochement): JsonResponse
    {
        [$liste, $resultats] = $rapprochement->analyser($request->validated('texte'));

        return ApiResponse::ok([
            'premier_jour' => $liste->premierJour?->toDateString(),
            'dernier_jour' => $liste->dernierJour?->toDateString(),
            'pharmacies' => array_map(
                fn (int $rang, PharmacieRapprochee $r): array => ['rang' => $rang] + $r->versTableau(),
                array_keys($resultats),
                $resultats,
            ),
        ]);
    }

    public function importer(ListeGardeRequest $request, ImportListeGarde $import): JsonResponse
    {
        $jour = fn (?string $date): ?CarbonImmutable => $date !== null ? CarbonImmutable::createFromFormat('!Y-m-d', $date) ?: null : null;
        $simulation = $request->boolean('simulation');

        $bilan = $import->importer(
            $request->validated('texte'),
            $request->decisions(),
            $request->compte(),
            $jour($request->validated('premier_jour')),
            $jour($request->validated('dernier_jour')),
            $simulation,
        );

        return $simulation ? ApiResponse::ok($bilan) : ApiResponse::created($bilan);
    }
}
