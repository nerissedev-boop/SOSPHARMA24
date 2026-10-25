<?php

declare(strict_types=1);

namespace App\Modules\Support\Http\Controllers;

use App\Commun\Http\ApiResponse;
use App\Commun\Http\AppareilCourant;
use App\Commun\Http\Requetes\ParametresListe;
use App\Commun\Securite\CompteAvecRole;
use App\Http\Controllers\Controller;
use App\Modules\Support\Enums\StatutMessage;
use App\Modules\Support\Enums\SujetMessage;
use App\Modules\Support\Exceptions\MessageIntrouvable;
use App\Modules\Support\Http\Requests\CaptureRequest;
use App\Modules\Support\Http\Requests\EnvoyerMessageRequest;
use App\Modules\Support\Http\Resources\MessageRecuResource;
use App\Modules\Support\Http\Resources\MessageSupportResource;
use App\Modules\Support\Models\MessageSupport;
use App\Modules\Support\Services\MessagesSupport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SupportController extends Controller
{
    public function __construct(private readonly MessagesSupport $messages) {}

    public function store(EnvoyerMessageRequest $request): JsonResponse
    {
        $message = $this->messages->recevoir(
            SujetMessage::from($request->validated('sujet')),
            $request->validated('message'),
            $request->validated('contact'),
            AppareilCourant::id($request),
        );

        return ApiResponse::created(new MessageRecuResource($message));
    }

    public function capture(CaptureRequest $request, string $message): JsonResponse
    {
        $modele = MessageSupport::query()->where('id_public', $message)->first() ?? throw new MessageIntrouvable;

        return ApiResponse::ok(new MessageRecuResource($this->messages->joindreCapture($modele, $request->file('capture'), AppareilCourant::id($request))));
    }

    public function index(Request $request): JsonResponse
    {
        $p = ParametresListe::depuis($request, ['statut', 'sujet'], ['cree_le' => 'created_at'], triParDefaut: ['created_at', 'desc']);
        $statut = $p->filtreParmi('statut', array_column(StatutMessage::cases(), 'value'));
        $sujet = $p->filtreParmi('sujet', array_column(SujetMessage::cases(), 'value'));

        $requete = MessageSupport::query()
            ->when($statut !== null, fn ($r) => $r->where('statut', $statut))
            ->when($sujet !== null, fn ($r) => $r->where('sujet', $sujet));

        return ApiResponse::paginated($p->trier($requete)->paginate($p->parPage, ['*'], 'page', $p->page), MessageSupportResource::class);
    }

    public function show(MessageSupport $message): JsonResponse
    {
        return ApiResponse::ok(new MessageSupportResource($message));
    }

    /** Fichier de la capture (réponse binaire, pas d'enveloppe JSON). */
    public function telechargerCapture(MessageSupport $message): StreamedResponse
    {
        $capture = $this->messages->capture($message);

        return Storage::disk(MessagesSupport::DISQUE)->response($capture['chemin'], null, array_filter(['Content-Type' => $capture['type']]));
    }

    public function traiter(Request $request, MessageSupport $message): JsonResponse
    {
        /** @var CompteAvecRole $compte */
        $compte = $request->user();

        return ApiResponse::ok(new MessageSupportResource($this->messages->traiter($message, $compte)));
    }
}
