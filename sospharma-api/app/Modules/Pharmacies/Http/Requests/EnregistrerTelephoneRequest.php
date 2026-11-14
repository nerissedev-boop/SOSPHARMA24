<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Http\Requests;

use App\Commun\Http\Requetes\RequeteApi;
use App\Commun\Support\NumerosTelephone;
use App\Modules\Pharmacies\Models\Pharmacie;
use Illuminate\Validation\Validator;

/**
 * POST …/pharmacies/{id}/telephones : un numéro relevé sur place.
 * L'agent tape le numéro comme il le lit sur la devanture (« 07 07 12 34 56 ») : il est remis au format
 * international avec l'indicatif du pays de la pharmacie. Un numéro qu'il faudrait corriger est refusé,
 * contrairement aux imports : la personne est sur place et peut le retaper.
 */
class EnregistrerTelephoneRequest extends RequeteApi
{
    private ?string $numero = null;

    public function rules(): array
    {
        return [
            'numero' => ['required', 'string', 'max:30', 'regex:/^[\d\s+().\-]+$/'],
            'whatsapp' => ['sometimes', 'boolean'],
            'principal' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'numero.regex' => 'Le numéro ne doit contenir que des chiffres, par exemple 07 07 12 34 56.',
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->has('numero')) {
                return;
            }
            /** @var Pharmacie $pharmacie */
            $pharmacie = $this->route('pharmacie');
            $lus = NumerosTelephone::pour($pharmacie->loadMissing('ville.pays')->ville->pays->indicatif)->lire((string) $this->input('numero'));

            if (count($lus->numeros) > 1) {
                $validator->errors()->add('numero', 'Un seul numéro à la fois.');
            } elseif (count($lus->numeros) === 0 || $lus->illisibles !== [] || $lus->avertissements !== []) {
                $validator->errors()->add('numero', 'Ce numéro n\'est pas reconnu. Saisissez-le en entier, par exemple 07 07 12 34 56.');
            } else {
                $this->numero = $lus->numeros[0];
            }
        }];
    }

    /** Numéro au format E.164, une fois la validation passée. */
    public function numero(): string
    {
        return (string) $this->numero;
    }

    public function whatsapp(): ?bool
    {
        return $this->has('whatsapp') ? $this->boolean('whatsapp') : null;
    }

    public function principal(): bool
    {
        return $this->boolean('principal');
    }
}
