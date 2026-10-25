<?php

declare(strict_types=1);

namespace App\Modules\Releves\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;

/** POST /propositions/{id}/photo : la photo de la façade (seule photo d'une proposition d'usager). */
class PhotoPropositionRequest extends RequeteApi
{
    public function rules(): array
    {
        return PhotoReleveRequest::reglesPhoto();
    }
}
