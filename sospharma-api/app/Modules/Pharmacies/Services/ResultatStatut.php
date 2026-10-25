<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Services;

use App\Modules\Pharmacies\Contrats\PeriodeGarde;
use App\Modules\Pharmacies\Enums\StatutOuverture;
use Carbon\CarbonImmutable;

final class ResultatStatut
{
    public function __construct(
        public readonly StatutOuverture $statut,
        /** Prochaine ouverture (UTC) si fermée, sinon null. */
        public readonly ?CarbonImmutable $prochaineOuverture = null,
        /** Garde en cours si statut « garde ». */
        public readonly ?PeriodeGarde $garde = null,
        /**
         * Heure locale (« 02:00 ») à laquelle la garde en cours se termine si c'est avant le
         * matin qui suit ; null si elle couvre toute la nuit (libellé « Ouverte toute la nuit »).
         */
        public readonly ?string $gardeJusqua = null,
        /** Heure locale de fermeture (« 20:00 ») si la pharmacie est ouverte selon ses horaires, sinon null (24h/24, garde, fermée). */
        public readonly ?string $fermeA = null,
    ) {}
}
