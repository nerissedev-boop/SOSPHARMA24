<?php

declare(strict_types=1);

namespace App\Modules\Signalements\Enums;

enum MotifSignalement: string
{
    case Fermee = 'fermee';
    case PasDeGarde = 'pas_de_garde';
    case MauvaiseAdresse = 'mauvaise_adresse';
    case MauvaisTelephone = 'mauvais_telephone';
    case HorairesFaux = 'horaires_faux';
    case Autre = 'autre';

    public function libelle(): string
    {
        return match ($this) {
            self::Fermee => 'La pharmacie était fermée',
            self::PasDeGarde => 'Elle n\'était pas de garde',
            self::MauvaiseAdresse => 'Adresse ou position incorrecte',
            self::MauvaisTelephone => 'Numéro de téléphone incorrect',
            self::HorairesFaux => 'Horaires incorrects',
            self::Autre => 'Autre',
        };
    }
}
