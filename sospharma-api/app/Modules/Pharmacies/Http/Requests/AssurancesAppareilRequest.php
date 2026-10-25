<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Pharmacies\Services\AssurancesAppareil;

/** PUT /appareils/moi/assurances : remplace « mes assurances » (identifiants publics, liste vide pour tout retirer). */
class AssurancesAppareilRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'assurances' => ['present', 'array', 'max:'.AssurancesAppareil::MAX],
            'assurances.*' => ['string', 'distinct', 'regex:/^as_[a-z0-9_]+$/'],
        ];
    }
}
