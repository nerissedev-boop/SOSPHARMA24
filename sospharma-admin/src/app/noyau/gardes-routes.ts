import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Réservé à l'équipe (admin et éditeur de ville) : les autres rôles n'ont pas de back-office. */
export const equipeSeulement: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const compte = await session.compteCourant();
  if (!compte) return router.createUrlTree(['/connexion']);
  if (compte.role !== 'admin' && compte.role !== 'editeur_ville') {
    session.oublier();
    return router.createUrlTree(['/connexion'], { queryParams: { refuse: 1 } });
  }
  return true;
};

/** Écrans réservés à l'admin dans l'API (comptes, liste de garde officielle…). */
export const adminSeulement: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const compte = await session.compteCourant();
  return compte?.role === 'admin' ? true : router.createUrlTree(['/']);
};

/** Page de connexion : inutile si la session est déjà ouverte. */
export const invitesSeulement: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const compte = await session.compteCourant();
  return compte ? router.createUrlTree(['/']) : true;
};
