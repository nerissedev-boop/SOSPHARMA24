import * as Sentry from '@sentry/react-native';

import { config } from './config';

/**
 * Suivi des erreurs (Sentry, palier gratuit). Désactivé si EXPO_PUBLIC_SENTRY_DSN est absente :
 * les erreurs sont alors seulement écrites dans la console en développement.
 */
let actif = false;

export function initialiserSentry(): void {
  if (actif || !config.sentryDsn) return;
  try {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.environnement,
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
    });
    actif = true;
  } catch (e) {
    console.warn('Sentry non initialisé', e);
  }
}

export function sentryActif(): boolean {
  return actif;
}

export function signalerErreur(erreur: unknown, contexte?: Record<string, unknown>): void {
  if (actif) {
    Sentry.captureException(erreur, contexte ? { extra: contexte } : undefined);
  } else if (__DEV__ && process.env.NODE_ENV !== 'test') {
    console.warn('[erreur]', erreur, contexte ?? '');
  }
}

type GestionnaireGlobal = (erreur: Error, fatale?: boolean) => void;
type ErrorUtilsType = { getGlobalHandler: () => GestionnaireGlobal; setGlobalHandler: (g: GestionnaireGlobal) => void };
type HermesType = {
  enablePromiseRejectionTracker?: (o: { allRejections: boolean; onUnhandled: (id: number, e: unknown) => void }) => void;
};

let gestionnaireInstalle = false;

/**
 * Gestionnaire global des erreurs non attrapées (exceptions JS et promesses rejetées).
 * Quand Sentry est actif, il installe déjà ses propres intégrations : on n'ajoute alors
 * que le relais des exceptions fatales (sans doublon pour les promesses).
 */
export function installerGestionnaireGlobal(): void {
  if (gestionnaireInstalle) return;
  gestionnaireInstalle = true;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsType }).ErrorUtils;
  if (errorUtils) {
    const precedent = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((erreur, fatale) => {
      if (!actif) signalerErreur(erreur, { fatale: Boolean(fatale) });
      precedent(erreur, fatale);
    });
  }
  const hermes = (globalThis as { HermesInternal?: HermesType }).HermesInternal;
  if (!actif && hermes?.enablePromiseRejectionTracker) {
    hermes.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (_id, e) => signalerErreur(e, { promesse: true }),
    });
  }
}

export const enveloppeSentry = Sentry.wrap;
