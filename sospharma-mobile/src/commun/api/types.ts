import type { Meta } from './schema';

/**
 * Codes d'erreur de l'API (liste fermée, specs/architecture.md « Codes d'erreur »),
 * plus deux codes propres à l'app, jamais renvoyés par l'API :
 * - NETWORK_ERROR : pas de réseau, délai dépassé ;
 * - INVALID_RESPONSE : réponse qui ne respecte pas l'enveloppe standard.
 */
export const CODES_ERREUR_API = [
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_FAILED',
  'ZONE_NOT_COVERED',
  'TOO_MANY_REQUESTS',
  'SERVER_ERROR',
  'MAINTENANCE',
] as const;

export const CODES_ERREUR_APP = ['NETWORK_ERROR', 'INVALID_RESPONSE'] as const;

export type CodeErreurApi = (typeof CODES_ERREUR_API)[number];
export type CodeErreur = CodeErreurApi | (typeof CODES_ERREUR_APP)[number];

export type ErreurApi = {
  code: CodeErreur;
  message: string;
  details?: Record<string, string[] | unknown>;
};

/** Enveloppe JSON de toutes les réponses de l'API. */
export type EnveloppeSucces<T> = { success: true; data: T; meta: Meta };
export type EnveloppeErreur = { success: false; error: ErreurApi; meta: Meta };
export type Enveloppe<T> = EnveloppeSucces<T> | EnveloppeErreur;

/**
 * Résultat unique de chaque appel : l'enveloppe, enrichie du statut HTTP.
 * En erreur réseau ou de format, `meta` est null (pas de réponse exploitable).
 */
export type ApiResult<T> =
  | { success: true; data: T; meta: Meta; status: number }
  | { success: false; error: ErreurApi; meta: Meta | null; status: number | null };

/** Erreur levée par les hooks (TanStack Query attend une exception). */
export class ErreurAppel extends Error {
  readonly code: CodeErreur;
  readonly details?: Record<string, unknown>;
  readonly requestId: string | null;
  readonly status: number | null;

  constructor(erreur: ErreurApi, meta: Meta | null, status: number | null) {
    super(erreur.message);
    this.name = 'ErreurAppel';
    this.code = erreur.code;
    this.details = erreur.details;
    this.requestId = meta?.request_id ?? null;
    this.status = status;
  }
}

export function estErreurAppel(e: unknown): e is ErreurAppel {
  return e instanceof ErreurAppel;
}
