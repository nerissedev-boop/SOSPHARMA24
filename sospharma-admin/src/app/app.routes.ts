import { Routes } from '@angular/router';
import { adminSeulement, equipeSeulement, invitesSeulement } from './noyau/gardes-routes';

export const routes: Routes = [
  {
    path: 'connexion',
    canActivate: [invitesSeulement],
    title: 'Connexion · SOS Pharma 24',
    loadComponent: () => import('./pages/connexion/connexion').then((m) => m.Connexion),
  },
  {
    path: 'mot-de-passe-oublie',
    title: 'Mot de passe oublié · SOS Pharma 24',
    loadComponent: () => import('./pages/connexion/oubli').then((m) => m.Oubli),
  },
  {
    // Adresse construite par l'API dans l'e-mail (ComptesServiceProvider).
    path: 'reinitialiser-mot-de-passe',
    title: 'Nouveau mot de passe · SOS Pharma 24',
    loadComponent: () => import('./pages/connexion/reinitialiser').then((m) => m.Reinitialiser),
  },
  {
    path: '',
    canActivate: [equipeSeulement],
    loadComponent: () => import('./ui/coquille').then((m) => m.Coquille),
    children: [
      {
        path: '',
        title: 'Tableau de bord · SOS Pharma 24',
        loadComponent: () => import('./pages/tableau-bord/tableau-bord').then((m) => m.TableauBord),
      },
      {
        path: 'pharmacies',
        title: 'Pharmacies · SOS Pharma 24',
        loadComponent: () => import('./pages/pharmacies/liste-pharmacies').then((m) => m.ListePharmacies),
      },
      {
        path: 'pharmacies/import',
        canActivate: [adminSeulement],
        title: 'Importer des pharmacies · SOS Pharma 24',
        loadComponent: () => import('./pages/pharmacies/import-pharmacies').then((m) => m.ImportPharmacies),
      },
      {
        path: 'pharmacies/:id',
        title: 'Fiche pharmacie · SOS Pharma 24',
        loadComponent: () => import('./pages/pharmacies/fiche-pharmacie').then((m) => m.FichePharmacie),
      },
      {
        path: 'gardes',
        title: 'Tours de garde · SOS Pharma 24',
        loadComponent: () => import('./pages/gardes/liste-tours').then((m) => m.ListeTours),
      },
      {
        path: 'gardes/liste-officielle',
        canActivate: [adminSeulement],
        title: 'Liste de garde officielle · SOS Pharma 24',
        loadComponent: () => import('./pages/gardes/import-liste').then((m) => m.ImportListe),
      },
      {
        path: 'gardes/:id',
        title: 'Tour de garde · SOS Pharma 24',
        loadComponent: () => import('./pages/gardes/fiche-tour').then((m) => m.FicheTour),
      },
      {
        path: 'signalements',
        title: 'Signalements · SOS Pharma 24',
        loadComponent: () => import('./pages/signalements/signalements').then((m) => m.Signalements),
      },
      {
        path: 'support',
        title: 'Support · SOS Pharma 24',
        loadComponent: () => import('./pages/support/support').then((m) => m.Support),
      },
      {
        path: 'comptes',
        canActivate: [adminSeulement],
        title: 'Comptes · SOS Pharma 24',
        loadComponent: () => import('./pages/comptes/comptes').then((m) => m.Comptes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
