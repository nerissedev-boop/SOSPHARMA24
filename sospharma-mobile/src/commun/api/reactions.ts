import { t } from '../lib/i18n';
import { signalerErreur } from '../lib/sentry';
import { estErreurAppel, type CodeErreur } from './types';

/**
 * LE seul endroit qui décide de la réaction de l'app à chaque error.code
 * (tableau « Codes d'erreur » de specs/architecture.md).
 * Les écrans appellent `reactionPour(erreur)` (ou le hook useReactionErreur) et
 * appliquent l'action renvoyée ; ils ne testent jamais les codes eux-mêmes.
 */
export type Reaction =
  | { type: 'ecran'; route: '/zone/non-couverte'; params?: Record<string, string> }
  | { type: 'introuvable'; message: string }
  | { type: 'formulaire'; message: string; champs: Record<string, string> }
  | { type: 'message'; message: string }
  | { type: 'cache'; message: string }
  | { type: 'connexion'; message: string };

function premierMessageParChamp(details: Record<string, unknown> | undefined): Record<string, string> {
  const champs: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(details ?? {})) {
    if (Array.isArray(valeur) && typeof valeur[0] === 'string') champs[cle] = valeur[0];
    else if (typeof valeur === 'string') champs[cle] = valeur;
  }
  return champs;
}

export function reactionPour(erreur: unknown): Reaction {
  if (!estErreurAppel(erreur)) {
    signalerErreur(erreur);
    return { type: 'message', message: t('erreurs.generique') };
  }
  const code: CodeErreur = erreur.code;
  switch (code) {
    case 'ZONE_NOT_COVERED': {
      const ville = (erreur.details as { ville?: unknown } | undefined)?.ville;
      return {
        type: 'ecran',
        route: '/zone/non-couverte',
        params: typeof ville === 'string' ? { ville } : undefined,
      };
    }
    case 'TOO_MANY_REQUESTS':
      return { type: 'message', message: t('erreurs.tropDeDemandes') };
    case 'VALIDATION_FAILED':
      return {
        type: 'formulaire',
        message: erreur.message || t('erreurs.validation'),
        champs: premierMessageParChamp(erreur.details),
      };
    case 'NOT_FOUND':
      return { type: 'introuvable', message: t('erreurs.introuvable') };
    case 'FORBIDDEN':
      return { type: 'message', message: t('erreurs.accesRefuse') };
    case 'UNAUTHENTICATED':
      // Pas de compte dans l'app : le jeton d'appareil sera recréé au prochain lancement.
      return { type: 'connexion', message: t('erreurs.generique') };
    case 'MAINTENANCE':
      return { type: 'cache', message: t('erreurs.maintenance') };
    case 'NETWORK_ERROR':
      return { type: 'cache', message: t('erreurs.reseau') };
    case 'SERVER_ERROR':
    case 'INVALID_RESPONSE':
      signalerErreur(erreur, { request_id: erreur.requestId, code });
      return { type: 'message', message: t('erreurs.generique') };
    case 'BAD_REQUEST':
    case 'CONFLICT':
    default:
      return { type: 'message', message: erreur.message || t('erreurs.generique') };
  }
}

/** Erreurs pour lesquelles on garde les données en cache et on affiche le bandeau. */
export function estErreurHorsConnexion(erreur: unknown): boolean {
  return estErreurAppel(erreur) && (erreur.code === 'NETWORK_ERROR' || erreur.code === 'MAINTENANCE');
}

/** TanStack Query : ne pas réessayer les erreurs métier (4xx), seulement réseau et 5xx. */
export function doitReessayer(nombreEchecs: number, erreur: unknown): boolean {
  if (nombreEchecs >= 2) return false;
  if (!estErreurAppel(erreur)) return false;
  return erreur.code === 'NETWORK_ERROR' || erreur.code === 'SERVER_ERROR';
}
