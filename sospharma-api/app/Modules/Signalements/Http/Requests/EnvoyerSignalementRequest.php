<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Modules\Signalements\Enums\MotifSignalement;
use Illuminate\Validation\Rule;

class EnvoyerSignalementRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'motif' => ['required', Rule::enum(MotifSignalement::class)],
            'precisions' => ['nullable', 'string', 'max:500', 'required_if:motif,autre'],
        ];
    }

    public function messages(): array
    {
        return [
            'motif.required' => 'Choisissez un motif de signalement.',
            'motif.enum' => 'Choisissez un motif de signalement.',
            'precisions.required_if' => 'Précisez le problème rencontré.',
        ];
    }
}
