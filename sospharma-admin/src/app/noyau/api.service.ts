import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Page, Pagination } from './types';

/** Erreur de l'API, telle que l'enveloppe la décrit : `{ code, message, details }`. */
export class ErreurApi extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statut: number,
    readonly details: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** Premier message de chaque champ, sinon le message général. */
  get messages(): string[] {
    const parChamp = Object.values(this.details)
      .map((liste) => liste[0])
      .filter(Boolean);
    return parChamp.length > 0 ? parChamp : [this.message];
  }
}

/** Texte à afficher pour n'importe quelle erreur attrapée. */
export function messageErreur(e: unknown): string {
  if (e instanceof ErreurApi) return e.messages.join(' ');
  return 'Une erreur inattendue est survenue.';
}

interface Enveloppe<T> {
  success: boolean;
  data: T;
  meta?: { pagination?: Pagination; [cle: string]: unknown };
}

export type Parametres = Record<string, string | number | boolean | null | undefined>;

/** Client de l'API : préfixe, paramètres de liste, enveloppe `{success, data, meta}` et erreurs. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly base = environment.apiUrl;

  get<T>(chemin: string, parametres: Parametres = {}): Observable<T> {
    return this.http
      .get<Enveloppe<T>>(this.url(chemin), { params: this.params(parametres) })
      .pipe(
        map((r) => r.data),
        catchError(versErreur),
      );
  }

  page<T>(chemin: string, parametres: Parametres = {}): Observable<Page<T>> {
    return this.http.get<Enveloppe<T[]>>(this.url(chemin), { params: this.params(parametres) }).pipe(
      map((r) => ({
        donnees: r.data,
        pagination: r.meta?.pagination ?? { page: 1, per_page: r.data.length, total: r.data.length, last_page: 1 },
      })),
      catchError(versErreur),
    );
  }

  post<T>(chemin: string, corps: unknown = {}): Observable<T> {
    return this.http.post<Enveloppe<T>>(this.url(chemin), corps).pipe(
      map((r) => r.data),
      catchError(versErreur),
    );
  }

  patch<T>(chemin: string, corps: unknown): Observable<T> {
    return this.http.patch<Enveloppe<T>>(this.url(chemin), corps).pipe(
      map((r) => r.data),
      catchError(versErreur),
    );
  }

  put<T>(chemin: string, corps: unknown): Observable<T> {
    return this.http.put<Enveloppe<T>>(this.url(chemin), corps).pipe(
      map((r) => r.data),
      catchError(versErreur),
    );
  }

  delete<T>(chemin: string, corps?: unknown): Observable<T> {
    return this.http.delete<Enveloppe<T>>(this.url(chemin), { body: corps }).pipe(
      map((r) => r?.data as T),
      catchError(versErreur),
    );
  }

  /** Fichier privé (capture, photo) : passe par HttpClient pour porter le jeton. */
  fichier(url: string): Observable<Blob> {
    return this.http.get(this.url(url), { responseType: 'blob' }).pipe(catchError(versErreur));
  }

  private url(chemin: string): string {
    return chemin.startsWith('http') ? chemin : `${this.base}/${chemin.replace(/^\//, '')}`;
  }

  /** Les valeurs vides sont retirées : l'API refuse les paramètres inattendus. */
  private params(parametres: Parametres): HttpParams {
    let p = new HttpParams();
    for (const [cle, valeur] of Object.entries(parametres)) {
      if (valeur === null || valeur === undefined || valeur === '') continue;
      p = p.set(cle, String(valeur));
    }
    return p;
  }
}

function versErreur(e: unknown): Observable<never> {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) {
      return throwError(
        () => new ErreurApi('RESEAU', "L'API ne répond pas. Vérifiez qu'elle est démarrée et joignable.", 0),
      );
    }
    const corps = e.error?.error;
    if (corps?.code) {
      return throwError(() => new ErreurApi(corps.code, corps.message ?? 'Erreur inconnue.', e.status, corps.details ?? {}));
    }
    return throwError(() => new ErreurApi('HTTP_' + e.status, `Erreur ${e.status} de l'API.`, e.status));
  }
  return throwError(() => e);
}
