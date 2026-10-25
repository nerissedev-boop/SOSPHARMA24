<?php

declare(strict_types=1);

namespace App\Modules\Support\Enums;

enum SujetMessage: string
{
    case Question = 'question';
    case ProblemeTechnique = 'probleme_technique';
    case DonneesPharmacie = 'donnees_pharmacie';
    case Suggestion = 'suggestion';
    case Autre = 'autre';
}
