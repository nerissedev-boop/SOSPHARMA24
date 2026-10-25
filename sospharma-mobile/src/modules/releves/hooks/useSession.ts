import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { donneesOuErreur, type Connexion } from '@/commun/api';
import { sessionAgentExpiree, useSessionAgent } from '@/commun/lib';

import { clesReleves, connecter, deconnecter as deconnecterApi } from '../api';
import { effacerJeton, enregistrerJeton, lireJeton } from '../jeton';

/** Rôles admis dans l'espace agent de l'app (les pharmaciens suivront, architecture). */
const ROLES_ADMIS = ['agent_terrain'];

export class RoleNonAdmis extends Error {}

/** Connexion Sanctum : le jeton part dans expo-secure-store, l'identité dans la session agent. */
export function useConnexionAgent() {
  const connecterSession = useSessionAgent((e) => e.connecter);
  return useMutation({
    mutationFn: async ({ email, motDePasse, resterConnecte }: { email: string; motDePasse: string; resterConnecte: boolean }) => {
      const r: Connexion = donneesOuErreur(await connecter(email, motDePasse));
      if (!ROLES_ADMIS.includes(r.compte.role)) throw new RoleNonAdmis();
      await enregistrerJeton(r.jeton, resterConnecte);
      connecterSession({
        id: r.compte.id,
        prenom: r.compte.prenom,
        nom: r.compte.nom,
        ville: r.compte.villes[0]?.nom ?? '',
        villes: r.compte.villes,
      });
      return r;
    },
  });
}

/** Déconnexion : révoque le jeton côté API si possible, puis efface tout sur le téléphone. */
export function useDeconnexionAgent() {
  const client = useQueryClient();
  const deconnecterSession = useSessionAgent((e) => e.deconnecter);
  return useCallback(
    async (revoquer = true) => {
      if (revoquer) await deconnecterApi().catch(() => undefined);
      await effacerJeton();
      deconnecterSession();
      client.removeQueries({ queryKey: clesReleves.tout });
    },
    [client, deconnecterSession],
  );
}

/**
 * Au lancement : déconnexion automatique après 30 jours sans usage, ou si le jeton a disparu
 * (« Rester connecté » décoché, réinstallation).
 */
export function useVerifierSessionAgent() {
  const agent = useSessionAgent((e) => e.agent);
  const derniereActivite = useSessionAgent((e) => e.derniereActivite);
  const deconnecter = useDeconnexionAgent();
  useEffect(() => {
    if (!agent) return;
    let annule = false;
    void (async () => {
      const jeton = await lireJeton();
      if (annule) return;
      if (!jeton) await deconnecter(false);
      else if (sessionAgentExpiree(derniereActivite)) await deconnecter(true);
    })();
    return () => {
      annule = true;
    };
    // Vérification au lancement seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
