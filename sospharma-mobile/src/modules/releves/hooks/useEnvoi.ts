import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useSessionAgent } from '@/commun/lib';

import { clesReleves } from '../api';
import { envoyerFile, useFileReleves } from '../file';
import { useDeconnexionAgent } from './useSession';

/** Lance l'envoi de la file et rafraîchit « Mes relevés » ; gère la session expirée. */
export function useEnvoyerFile() {
  const client = useQueryClient();
  const deconnecter = useDeconnexionAgent();
  return useCallback(async () => {
    if (useFileReleves.getState().elements.length === 0) return;
    const bilan = await envoyerFile();
    if (bilan.envoyes > 0) void client.invalidateQueries({ queryKey: clesReleves.releves });
    if (bilan.sessionExpiree) await deconnecter(false);
  }, [client, deconnecter]);
}

/**
 * Envoi automatique (racine de l'app) : au lancement, au retour du réseau et au retour
 * au premier plan, tant qu'un agent est connecté et que la file n'est pas vide.
 */
export function useEnvoiAutomatique() {
  const agent = useSessionAgent((e) => e.agent);
  const envoyer = useEnvoyerFile();
  useEffect(() => {
    if (!agent) return;
    if (onlineManager.isOnline()) void envoyer();
    const desabonnerReseau = onlineManager.subscribe((enLigne) => {
      if (enLigne) void envoyer();
    });
    const abonnementEtat = AppState.addEventListener('change', (etat) => {
      if (etat === 'active' && onlineManager.isOnline()) void envoyer();
    });
    return () => {
      desabonnerReseau();
      abonnementEtat.remove();
    };
  }, [agent, envoyer]);
}
