import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { stockageSynchrone } from './stockage';

/**
 * Agent terrain connecté (espace agent, module Relevés). Seule l'identité affichée est ici,
 * dans MMKV : le jeton Sanctum reste dans expo-secure-store, géré par le module Relevés.
 * La barre d'onglets lit cet état pour remplacer l'onglet Profil par « Relevés ».
 */
export type AgentConnecte = {
  id: string;
  prenom: string;
  nom: string;
  /** Ville principale affichée (« Agent terrain, Abidjan »). */
  ville: string;
  villes: { id: string; nom: string }[];
};

type EtatSessionAgent = {
  agent: AgentConnecte | null;
  /** Dernière utilisation de l'espace agent (déconnexion automatique après 30 jours). */
  derniereActivite: string | null;
  connecter: (agent: AgentConnecte) => void;
  marquerActivite: () => void;
  deconnecter: () => void;
};

export const useSessionAgent = create<EtatSessionAgent>()(
  persist(
    (set) => ({
      agent: null,
      derniereActivite: null,
      connecter: (agent) => set({ agent, derniereActivite: new Date().toISOString() }),
      marquerActivite: () => set({ derniereActivite: new Date().toISOString() }),
      deconnecter: () => set({ agent: null, derniereActivite: null }),
    }),
    { name: 'session-agent', version: 1, storage: createJSONStorage(() => stockageSynchrone) },
  ),
);

export const DUREE_INACTIVITE_AGENT_MS = 30 * 24 * 3600 * 1000;

/** Vrai si la session agent a dépassé 30 jours sans usage. */
export function sessionAgentExpiree(derniereActivite: string | null, maintenant = new Date()): boolean {
  if (!derniereActivite) return true;
  return maintenant.getTime() - new Date(derniereActivite).getTime() > DUREE_INACTIVITE_AGENT_MS;
}
