import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionService } from './session.service';

/** Ajoute le jeton aux appels vers l'API et renvoie à la connexion si l'API le refuse. */
export const intercepteurApi: HttpInterceptorFn = (requete, suivant) => {
  if (!requete.url.startsWith(environment.apiUrl)) return suivant(requete);

  const session = inject(SessionService);
  const router = inject(Router);
  const jeton = session.jeton();
  const enTetes: Record<string, string> = { Accept: 'application/json' };
  if (jeton) enTetes['Authorization'] = `Bearer ${jeton}`;

  return suivant(requete.clone({ setHeaders: enTetes })).pipe(
    tap({
      error: (e) => {
        if (e?.status === 401 && jeton && !requete.url.endsWith('/auth/connexion')) {
          session.oublier();
          void router.navigate(['/connexion'], { queryParams: { expiree: 1 } });
        }
      },
    }),
  );
};
