<?php

declare(strict_types=1);

namespace App\Modules\Gardes\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Modules\Gardes\Http\Requests\EnCoursRequest;
use App\Modules\Gardes\Http\Resources\TourPublicResource;
use App\Modules\Gardes\Services\TourEnCours;
use App\Modules\Territoire\Models\Ville;
use Illuminate\Http\JsonResponse;

class GardePubliqueController extends Controller
{
    public function enCours(EnCoursRequest $request, TourEnCours $service): JsonResponse
    {
        $villeId = (int) Ville::query()->where('id_public', $request->validated('ville'))->value('id');
        $lat = $request->validated('lat');
        $lng = $request->validated('lng');
        $resultat = $service->pour($villeId, $lat !== null ? (float) $lat : null, $lng !== null ? (float) $lng : null);

        return ApiResponse::ok(new TourPublicResource($resultat), ['nombre' => count($resultat['pharmacies'])]);
    }
}
