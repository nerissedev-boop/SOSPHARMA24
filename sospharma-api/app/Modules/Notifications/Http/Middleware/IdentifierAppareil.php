<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Middleware;

use App\Commun\Http\AppareilCourant;
use App\Modules\Notifications\Exceptions\AppareilNonReconnu;
use App\Modules\Notifications\Models\Appareil;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Résout l'appareil depuis l'en-tête X-Device-Token et le dépose dans la requête
 * (lu ensuite via AppareilCourant, sans dépendance vers ce module). Alias « appareil » : obligatoire.
 */
class IdentifierAppareil
{
    protected bool $obligatoire = true;

    public function handle(Request $request, Closure $next): Response
    {
        $jeton = (string) $request->headers->get(AppareilCourant::ENTETE, '');
        $appareil = $jeton !== ''
            ? Appareil::query()->where('jeton_hash', Appareil::hacherJeton($jeton))->where('actif', true)->first()
            : null;

        if ($appareil === null && $this->obligatoire) {
            throw new AppareilNonReconnu;
        }

        if ($appareil !== null) {
            $request->attributes->set(AppareilCourant::ATTRIBUT, $appareil->id);
            $request->attributes->set('appareil', $appareil);
        }

        return $next($request);
    }
}
