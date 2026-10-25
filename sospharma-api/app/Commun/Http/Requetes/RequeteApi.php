<?php

declare(strict_types=1);

namespace App\Commun\Http\Requetes;

use App\Commun\Securite\CompteAvecRole;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Base des Form Requests : l'autorisation fine est faite par les Policies dans les contrôleurs,
 * la Form Request ne fait que valider.
 */
abstract class RequeteApi extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function compte(): ?CompteAvecRole
    {
        $compte = $this->user();

        return $compte instanceof CompteAvecRole ? $compte : null;
    }

    /** @return array<string, mixed> */
    abstract public function rules(): array;
}
