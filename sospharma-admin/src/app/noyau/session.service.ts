import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Compte } from './types';

const CLE_JETON = 'sospharma.jeton';

function lireJeton(): string | null {
  try {
    return localStorage.getItem(CLE_JETON);
  } catch {
    return null;
  }
}

function ecrireJeton(jeton: string | null): void {
  try {
    if (jeton === null) localStorage.removeItem(CLE_JETON);
    else localStorage.setItem(CLE_JETON, jeton);
  } catch {
    /* stockage indisponible : la session ne survivra pas au rechargement */
  }
}

/** Session de l'équipe : jeton Sanctum gardé dans le navigateur, compte relu par /auth/moi. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly jeton = signal<string | null>(lireJeton());
  readonly compte = signal<Compte | null>(null);
  readonly estAdmin = computed(() => this.compte()?.role === 'admin');

  private chargement: Promise<Compte | null> | null = null;

  connexion(email: string, password: string): Observable<{ jeton: string; compte: Compte }> {
    return this.api
      .post<{ jeton: string; compte: Compte }>('auth/connexion', { email, password, nom_appareil: 'back-office' })
      .pipe(
        tap((r) => {
          ecrireJeton(r.jeton);
          this.jeton.set(r.jeton);
          this.compte.set(r.compte);
        }),
      );
  }

  /** Compte connecté, chargé une seule fois ; `null` si le jeton est absent ou refusé. */
  async compteCourant(): Promise<Compte | null> {
    if (this.compte()) return this.compte();
    if (!this.jeton()) return null;
    this.chargement ??= firstValueFrom(this.api.get<Compte>('auth/moi'))
      .then((c) => {
        this.compte.set(c);
        return c;
      })
      .catch(() => {
        this.oublier();
        return null;
      })
      .finally(() => (this.chargement = null));
    return this.chargement;
  }

  async deconnexion(): Promise<void> {
    try {
      await firstValueFrom(this.api.post('auth/deconnexion'));
    } catch {
      /* jeton déjà expiré : rien à faire côté API */
    }
    this.oublier();
    await this.router.navigate(['/connexion']);
  }

  /** Jeton refusé (401) ou déconnexion : on efface tout. */
  oublier(): void {
    ecrireJeton(null);
    this.jeton.set(null);
    this.compte.set(null);
  }
}
