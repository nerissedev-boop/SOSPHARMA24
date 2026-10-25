<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\PositionRequest;
use App\Modules\Pharmacies\Services\RecherchePharmacies;

class ProchesRequest extends PositionRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'rayon' => ['sometimes', 'integer', 'min:100', 'max:'.RecherchePharmacies::RAYON_MAX_M],
            'limite' => ['sometimes', 'integer', 'min:1', 'max:'.RecherchePharmacies::LIMITE_MAX],
        ];
    }

    public function rayon(): int
    {
        return (int) $this->query('rayon', (string) RecherchePharmacies::RAYON_MAX_M);
    }

    public function limite(): int
    {
        return (int) $this->query('limite', (string) RecherchePharmacies::LIMITE_DEFAUT);
    }
}
