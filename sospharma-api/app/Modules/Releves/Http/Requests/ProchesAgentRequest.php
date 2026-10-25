<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Requests;

use App\Commun\Http\Requetes\PositionRequest;
use App\Modules\Releves\Services\DetectionDoublons;

/** Doublons possibles autour de l'agent : rayon de 100 m au plus. */
class ProchesAgentRequest extends PositionRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'rayon' => ['sometimes', 'integer', 'min:10', 'max:'.DetectionDoublons::RAYON_M],
            'limite' => ['sometimes', 'integer', 'min:1', 'max:'.DetectionDoublons::LIMITE_MAX],
        ];
    }

    public function rayon(): int
    {
        return (int) $this->query('rayon', (string) DetectionDoublons::RAYON_M);
    }

    public function limite(): int
    {
        return (int) $this->query('limite', (string) DetectionDoublons::LIMITE_DEFAUT);
    }
}
