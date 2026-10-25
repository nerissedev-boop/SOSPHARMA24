<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** Traiter (commentaire) ou rejeter (raison). */
class CloturerSignalementRequest extends RequeteApi
{
    public function rules(): array
    {
        return [
            'commentaire' => ['required_without:raison', 'nullable', 'string', 'max:1000'],
            'raison' => ['required_without:commentaire', 'nullable', 'string', 'max:1000'],
        ];
    }

    public function texte(): string
    {
        return (string) ($this->validated('commentaire') ?? $this->validated('raison'));
    }
}
