import { config } from '../lib/config';
import { t } from '../lib/i18n';
import { stockage } from '../lib/stockage';
import { transportDemo } from './demo/adaptateur';
import type { Meta } from './schema';
import { trouverRoute } from './traduction';
import { CODES_ERREUR_API, ErreurAppel, type ApiResult, type CodeErreur, type ErreurApi } from './types';

/**
 * Client HTTP de l'API (base EXPO_PUBLIC_API_URL, routes /api/v1/...).
 * Chaque appel est protégé par try/catch : erreur réseau, erreur de format et erreur
 * métier sont toutes converties en ApiResult. Aucun appel ne lève d'exception.
 */

export type ReponseTransport = { status: number; json: () => Promise<unknown> };
export type Transport = (url: string, init: RequestInit) => Promise<ReponseTransport>;

type ValeurParam = string | number | boolean | null | undefined | string[];

export type OptionsAppel = {
  methode?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  params?: Record<string, ValeurParam>;
  corps?: unknown;
  signal?: AbortSignal;
  delaiMs?: number;
  /** En-têtes en plus (ex. `Authorization: Bearer …` des routes agent). */
  entetes?: Record<string, string>;
};

const CLE_JETON = 'appareil.jeton';

/** Paramètres d'une adresse, dans l'ordre (clés telles que l'app les écrit : filter[statut]). */
function lireParams(requete: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const morceau of requete.split('&')) {
    if (!morceau) continue;
    const i = morceau.indexOf('=');
    const cle = decodeURIComponent(i < 0 ? morceau : morceau.slice(0, i));
    params.set(cle, i < 0 ? '' : decodeURIComponent(morceau.slice(i + 1)));
  }
  return params;
}

function ecrireParams(params: Map<string, string>): string {
  return [...params]
    .map(([cle, valeur]) => `${encodeURIComponent(cle).replace(/%5B/g, '[').replace(/%5D/g, ']')}=${encodeURIComponent(valeur)}`)
    .join('&');
}

/**
 * Transport réseau traduit : l'app parle son modèle, l'API Laravel le sien (voir traduction.ts).
 * Seules les routes listées sont touchées ; les autres passent telles quelles.
 */
export function avecTraduction(transport: Transport): Transport {
  return async (url, init) => {
    const [adresse = '', requete = ''] = url.split('?');
    const i = adresse.indexOf('/api/v1');
    const chemin = i < 0 ? adresse : adresse.slice(i + '/api/v1'.length);
    const route = trouverRoute((init.method ?? 'GET').toUpperCase(), chemin);
    if (!route) return transport(url, init);

    // Le contexte garde la requête de l'app, avant traduction (position, statuts demandés).
    const ctx = { params: lireParams(requete) };
    const depart = { params: ctx.params, corps: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined };
    const { params, corps } = route.requete ? route.requete(depart) : depart;
    const nouvelleRequete = ecrireParams(params);
    const reponse = await transport(`${adresse}${nouvelleRequete ? `?${nouvelleRequete}` : ''}`, {
      ...init,
      body: corps !== undefined ? JSON.stringify(corps) : init.body,
    });
    const traduire = route.reponse;
    if (!traduire) return reponse;
    return {
      status: reponse.status,
      json: async () => {
        const json = (await reponse.json()) as { success?: unknown; data?: unknown };
        // Seules les réponses réussies sont traduites ; une erreur garde l'enveloppe de l'API.
        if (json && json.success === true && json.data !== undefined && json.data !== null) {
          return { ...json, data: traduire(json.data, ctx) };
        }
        return json;
      },
    };
  };
}

let transportCourant: Transport = config.apiMock ? transportDemo : avecTraduction((url, init) => fetch(url, init));

/** Remplace le transport (tests, ou bascule démo/API réelle). */
export function definirTransport(transport: Transport): void {
  transportCourant = transport;
}

export function lireJetonAppareil(): string | null {
  return stockage().getString(CLE_JETON) ?? null;
}

export function definirJetonAppareil(jeton: string | null): void {
  if (jeton) stockage().set(CLE_JETON, jeton);
  else stockage().remove(CLE_JETON);
}

const ecouteursJetonRefuse = new Set<() => void>();

/**
 * Appelé quand l'API ne reconnaît plus le jeton d'appareil (401 UNAUTHENTICATED) : le jeton
 * vient d'être effacé, l'enregistrement de l'appareil doit être refait. Renvoie de quoi se désabonner.
 */
export function surJetonAppareilRefuse(ecouteur: () => void): () => void {
  ecouteursJetonRefuse.add(ecouteur);
  return () => ecouteursJetonRefuse.delete(ecouteur);
}

export function construireUrl(chemin: string, params?: Record<string, ValeurParam>): string {
  const base = config.apiUrl.replace(/\/$/, '');
  const morceaux: string[] = [];
  for (const [cle, valeur] of Object.entries(params ?? {})) {
    if (valeur === undefined || valeur === null || valeur === '' || valeur === false) continue;
    const texte = Array.isArray(valeur) ? valeur.join(',') : valeur === true ? '1' : String(valeur);
    if (texte === '') continue;
    morceaux.push(`${encodeURIComponent(cle).replace(/%5B/g, '[').replace(/%5D/g, ']')}=${encodeURIComponent(texte)}`);
  }
  return `${base}/api/v1${chemin}${morceaux.length ? `?${morceaux.join('&')}` : ''}`;
}

function erreurLocale(code: CodeErreur, message: string): ErreurApi {
  return { code, message };
}

function estMeta(m: unknown): m is Meta {
  return (
    typeof m === 'object' &&
    m !== null &&
    typeof (m as Meta).request_id === 'string' &&
    typeof (m as Meta).generated_at === 'string'
  );
}

/** Vérifie que la réponse respecte l'enveloppe standard et la convertit en ApiResult. */
export function lireEnveloppe<T>(json: unknown, status: number): ApiResult<T> {
  if (typeof json !== 'object' || json === null || typeof (json as { success?: unknown }).success !== 'boolean') {
    return { success: false, error: erreurLocale('INVALID_RESPONSE', t('erreurs.format')), meta: null, status };
  }
  const env = json as { success: boolean; data?: unknown; error?: Partial<ErreurApi>; meta?: unknown };
  const meta = estMeta(env.meta) ? env.meta : null;
  if (!meta) {
    return { success: false, error: erreurLocale('INVALID_RESPONSE', t('erreurs.format')), meta: null, status };
  }
  if (env.success) {
    if (!('data' in env) || env.error !== undefined) {
      return { success: false, error: erreurLocale('INVALID_RESPONSE', t('erreurs.format')), meta, status };
    }
    return { success: true, data: env.data as T, meta, status };
  }
  const code = env.error?.code;
  const connu = typeof code === 'string' && (CODES_ERREUR_API as readonly string[]).includes(code);
  return {
    success: false,
    error: {
      code: connu ? (code as CodeErreur) : 'SERVER_ERROR',
      message: typeof env.error?.message === 'string' ? env.error.message : t('erreurs.generique'),
      details: env.error?.details,
    },
    meta,
    status,
  };
}

export async function appeler<T>(chemin: string, options: OptionsAppel = {}): Promise<ApiResult<T>> {
  const { methode = 'GET', params, corps, signal, delaiMs = 15_000, entetes: entetesEnPlus } = options;
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), delaiMs);
  const relaisAnnulation = () => controleur.abort();
  signal?.addEventListener('abort', relaisAnnulation);

  try {
    const entetes: Record<string, string> = { Accept: 'application/json', 'Accept-Language': 'fr' };
    const jeton = lireJetonAppareil();
    if (jeton) entetes['X-Device-Token'] = jeton;
    Object.assign(entetes, entetesEnPlus);
    let body: BodyInit | undefined;
    if (corps instanceof FormData) {
      body = corps;
    } else if (corps !== undefined) {
      entetes['Content-Type'] = 'application/json';
      body = JSON.stringify(corps);
    }

    let reponse: ReponseTransport;
    try {
      reponse = await transportCourant(construireUrl(chemin, params), {
        method: methode,
        headers: entetes,
        body,
        signal: controleur.signal,
      });
    } catch {
      return { success: false, error: erreurLocale('NETWORK_ERROR', t('erreurs.reseau')), meta: null, status: null };
    }

    let json: unknown;
    try {
      json = await reponse.json();
    } catch {
      return {
        success: false,
        error: erreurLocale('INVALID_RESPONSE', t('erreurs.format')),
        meta: null,
        status: reponse.status,
      };
    }
    const resultat = lireEnveloppe<T>(json, reponse.status);
    // Jeton d'appareil inconnu de l'API (base restaurée, passage de la démo à l'API…) : on l'efface
    // pour que l'appareil se réenregistre. Les routes agent (jeton Sanctum) ne sont pas concernées.
    if (!resultat.success && resultat.error.code === 'UNAUTHENTICATED' && jeton && !entetesEnPlus?.Authorization) {
      definirJetonAppareil(null);
      ecouteursJetonRefuse.forEach((ecouteur) => ecouteur());
    }
    return resultat;
  } catch {
    return { success: false, error: erreurLocale('SERVER_ERROR', t('erreurs.generique')), meta: null, status: null };
  } finally {
    clearTimeout(minuterie);
    signal?.removeEventListener('abort', relaisAnnulation);
  }
}

/** Pour les hooks TanStack Query : renvoie `data` ou lève une ErreurAppel. */
export function donneesOuErreur<T>(resultat: ApiResult<T>): T {
  if (resultat.success) return resultat.data;
  throw new ErreurAppel(resultat.error, resultat.meta, resultat.status);
}

/** Variante qui garde aussi `meta` (compteurs, pagination). */
export function avecMetaOuErreur<T>(resultat: ApiResult<T>): { data: T; meta: Meta } {
  if (resultat.success) return { data: resultat.data, meta: resultat.meta };
  throw new ErreurAppel(resultat.error, resultat.meta, resultat.status);
}
