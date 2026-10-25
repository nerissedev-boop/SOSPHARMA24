import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { focusManager, onlineManager, QueryCache, QueryClient } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { doitReessayer, estErreurHorsConnexion } from '../api/reactions';
import { estErreurAppel } from '../api/types';
import { config } from './config';
import { signalerErreur } from './sentry';
import { stockageSynchrone } from './stockage';

const SEMAINE = 7 * 24 * 3600 * 1000;

/**
 * Client TanStack Query : cache persisté dans MMKV pour l'usage hors connexion.
 * Au lancement, l'app affiche d'abord le cache, puis le rafraîchit dès qu'il y a du réseau.
 */
export function creerClientRequetes(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (erreur, requete) => {
        if (estErreurHorsConnexion(erreur)) return;
        if (estErreurAppel(erreur) && (erreur.code === 'SERVER_ERROR' || erreur.code === 'INVALID_RESPONSE')) {
          signalerErreur(erreur, { request_id: erreur.requestId, requete: requete.queryKey.join('/') });
        } else if (!estErreurAppel(erreur)) {
          signalerErreur(erreur);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: SEMAINE,
        retry: doitReessayer,
        networkMode: 'offlineFirst',
      },
      mutations: { retry: false, networkMode: 'online' },
    },
  });
}

export const persisteur = createSyncStoragePersister({
  storage: stockageSynchrone,
  key: 'cache-requetes',
  throttleTime: 1000,
});

export const OPTIONS_PERSISTANCE = {
  persister: persisteur,
  maxAge: SEMAINE,
  /**
   * Changer cette valeur invalide le cache après une mise à jour qui change le format.
   * La source des données en fait partie : passer de la démo à l'API (ou d'une API à une autre)
   * jette le cache, sinon l'app relirait des identifiants qui n'existent pas sur la nouvelle source.
   */
  buster: `v1|${config.apiMock ? 'demo' : config.apiUrl}`,
};

/** Rafraîchissement au retour du réseau (NetInfo) et au retour au premier plan. */
export function brancherReseauEtPremierPlan(): () => void {
  onlineManager.setEventListener((setEnLigne) =>
    NetInfo.addEventListener((etat) => {
      setEnLigne(etat.isConnected !== false && etat.isInternetReachable !== false);
    }),
  );
  const abonnement = AppState.addEventListener('change', (statut: AppStateStatus) => {
    if (Platform.OS !== 'web') focusManager.setFocused(statut === 'active');
  });
  return () => abonnement.remove();
}
