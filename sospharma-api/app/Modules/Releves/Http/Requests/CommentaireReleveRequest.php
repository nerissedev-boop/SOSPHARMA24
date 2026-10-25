<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** À corriger (commentaire) ou rejeter (raison) : un texte est obligatoire. */
class CommentaireReleveRequest extends RequeteApi
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
