<?php

declare(strict_types=1);

namespace App\Modules\Pharmacies\Enums;

/** D'où vient un numéro de téléphone d'une pharmacie. */
enum OrigineTelephone: string
{
    /** Import CSV de l'annuaire (back-office). */
    case Import = 'import';
    case ListeGarde = 'liste_garde';
    case Osm = 'osm';
    /** Relevé terrain validé. */
    case Agent = 'agent';
    case Admin = 'admin';
    /** Le pharmacien, depuis son espace. */
    case Pharmacien = 'pharmacien';
    /** Colonnes telephone / whatsapp des fiches d'avant la table telephones_pharmacie : source inconnue. */
    case Reprise = 'reprise';
}
