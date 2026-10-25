<?php

declare(strict_types=1);

namespace App\Modules\Territoire\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Territoire\Enums\StatutVille;
use Illuminate\Validation\Rule;

class EnregistrerVilleRequest extends RequeteApi
{
    public function rules(): array
    {
        $requis = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'pays' => [$this->isMethod('post') ? 'required' : 'prohibited', 'string', Rule::exists('pays', 'code')],
            'nom' => [$requis, 'string', 'max:100'],
            'statut' => [$requis, Rule::enum(StatutVille::class)],
            'latitude' => [$requis, 'numeric', 'between:-90,90'],
            'longitude' => [$requis, 'numeric', 'between:-180,180'],
            'actif' => ['sometimes', 'boolean'],
        ];
    }
}
