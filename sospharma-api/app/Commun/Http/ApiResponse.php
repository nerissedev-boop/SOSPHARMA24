<?php

declare(strict_types=1);

namespace App\Commun\Http;

use App\Commun\Erreurs\CodeErreur;
use App\Commun\Http\Middleware\RequestId;
use App\Commun\Support\Dates;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Enveloppe JSON unique de l'API :
 *   succès : { success: true,  data, meta: { request_id, generated_at, ... } }
 *   échec  : { success: false, error: { code, message, details? }, meta: { request_id, generated_at } }
 */
final class ApiResponse
{
    private const OPTIONS_JSON = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;

    /** @param array<string, mixed> $meta */
    public static function ok(mixed $data, array $meta = [], int $statut = 200): JsonResponse
    {
        return self::reponse([
            'success' => true,
            'data' => self::normaliser($data),
            'meta' => self::meta($meta),
        ], $statut);
    }

    /** @param array<string, mixed> $meta */
    public static function created(mixed $data, array $meta = []): JsonResponse
    {
        return self::ok($data, $meta, 201);
    }

    /**
     * Pagination par page (tableaux du back-office).
     *
     * @param  class-string<JsonResource>|null  $ressource
     */
    public static function paginated(LengthAwarePaginator $page, ?string $ressource = null): JsonResponse
    {
        $items = $ressource !== null ? $ressource::collection($page->getCollection()) : $page->items();

        return self::ok($items, [
            'pagination' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    /**
     * Pagination par curseur (historiques longs).
     *
     * @param  class-string<JsonResource>|null  $ressource
     */
    public static function cursor(CursorPaginator $page, ?string $ressource = null): JsonResponse
    {
        $items = $ressource !== null ? $ressource::collection(collect($page->items())) : $page->items();

        return self::ok($items, [
            'per_page' => $page->perPage(),
            'next_cursor' => $page->nextCursor()?->encode(),
            'prev_cursor' => $page->previousCursor()?->encode(),
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $details
     * @param  array<string, string>  $entetes
     */
    public static function error(
        CodeErreur $code,
        ?string $message = null,
        ?array $details = null,
        ?int $statut = null,
        array $entetes = [],
    ): JsonResponse {
        $erreur = [
            'code' => $code->value,
            'message' => $message ?? $code->messageParDefaut(),
        ];
        if ($details !== null && $details !== []) {
            $erreur['details'] = $details;
        }

        return self::reponse([
            'success' => false,
            'error' => $erreur,
            'meta' => self::meta([]),
        ], $statut ?? $code->statutHttp(), $entetes);
    }

    /**
     * @param  array<string, mixed>  $supplement
     * @return array<string, mixed>
     */
    private static function meta(array $supplement): array
    {
        return [
            'request_id' => RequestId::courant(),
            'generated_at' => Dates::iso(now()),
            ...$supplement,
        ];
    }

    private static function normaliser(mixed $data): mixed
    {
        // Les ressources sont résolues ici pour ne pas être réenveloppées dans une clé « data ».
        if ($data instanceof JsonResource) {
            return $data->resolve(request());
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $corps
     * @param  array<string, string>  $entetes
     */
    private static function reponse(array $corps, int $statut, array $entetes = []): JsonResponse
    {
        $entetes['X-Request-Id'] = RequestId::courant();

        return new JsonResponse($corps, $statut, $entetes, self::OPTIONS_JSON);
    }
}
