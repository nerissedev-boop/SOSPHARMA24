<?php

declare(strict_types=1);

return [
    // Adresse du back-office Angular (liens de réinitialisation de mot de passe, CORS).
    'admin_url' => env('SOSPHARMA_ADMIN_URL', 'http://localhost:4200'),

    'expo' => [
        'url' => env('EXPO_PUSH_URL', 'https://exp.host/--/api/v2/push/send'),
        // Facultatif : jeton d'accès Expo si la sécurité renforcée des notifications est activée.
        'access_token' => env('EXPO_ACCESS_TOKEN'),
        'taille_lot' => 100,
        'delai_secondes' => 15,
        // Nouvel essai d'un envoi échoué, en minutes.
        'reessai_minutes' => 15,
        'tentatives_max' => 5,
        // Heure locale d'envoi de la notification du samedi.
        'heure_samedi' => env('NOTIFICATION_HEURE_SAMEDI', '08:00'),
    ],

    'sauvegarde' => [
        'dossier' => storage_path('app/private/sauvegardes'),
        'jours_conserves' => (int) env('SAUVEGARDE_JOURS_CONSERVES', 14),
        'mysqldump' => env('MYSQLDUMP_PATH', 'mysqldump'),
    ],

    'limites' => [
        'signalements_par_jour' => 5,
        'messages_par_jour' => 5,
        'connexions_par_minute' => 5,
        'api_par_minute' => 120,
        // Temps de trajet Google (payant) : par appareil ou adresse IP.
        'trajets_par_heure' => 30,
        // Agents terrain : relevés et photos par jour et par agent.
        'releves_par_jour' => 200,
        'photos_releves_par_jour' => 1000,
        // Usagers sans compte (« Proposer une pharmacie ») : par appareil, et par adresse IP.
        'propositions_par_jour' => 3,
        'propositions_par_ip' => 10,
        'photos_propositions_par_jour' => 10,
    ],

    // Comptes de test créés par les seeders (jamais en production).
    'seed' => [
        'admin_email' => env('SEED_ADMIN_EMAIL', 'admin@sospharma.test'),
        'mot_de_passe' => env('SEED_MOT_DE_PASSE'),
    ],
];
