import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { donneesOuErreur, type Releve } from '@/commun/api';
import { useSessionAgent } from '@/commun/lib';

import { clesReleves, lireReleves } from '../api';
import { useFileReleves } from '../file';
import type { EtatAffiche } from '../types';

export type LigneReleve = {
  id: string;
  nom: string;
  type: Releve['type'];
  commune: string | null;
  etat: EtatAffiche;
  date: string;
  commentaire: string | null;
  erreur: string | null;
};

/** « Mes relevés » : la file locale (à envoyer) d'abord, puis les relevés connus de l'API. */
export function useMesReleves() {
  const agent = useSessionAgent((e) => e.agent);
  const file = useFileReleves((e) => e.elements);
  const requete = useQuery({
    queryKey: clesReleves.releves,
    queryFn: async () => donneesOuErreur(await lireReleves()),
    enabled: agent !== null,
  });
  return useMemo(() => {
    const enFile = new Set(file.map((x) => x.releve.id));
    const locaux: LigneReleve[] = [...file]
      .sort((a, b) => b.releve.releve_le.localeCompare(a.releve.releve_le))
      .map((x) => ({
        id: x.releve.id,
        nom: x.releve.champs.nom,
        type: x.releve.type,
        commune: x.commune,
        etat: 'a_envoyer',
        date: x.releve.releve_le,
        commentaire: null,
        erreur: x.erreur,
      }));
    const distants: LigneReleve[] = (requete.data ?? [])
      .filter((r) => !enFile.has(r.identifiant))
      .map((r) => ({
        id: r.id,
        nom: r.nom,
        type: r.type,
        commune: r.commune,
        etat: r.statut,
        date: r.releve_le,
        commentaire: r.commentaire,
        erreur: null,
      }));
    const compter = (statut: Releve['statut']) => (requete.data ?? []).filter((r) => r.statut === statut).length;
    return {
      ...requete,
      lignes: [...locaux, ...distants],
      enAttente: file.length,
      compteurs: { valides: compter('valide'), enVerification: compter('envoye'), aCorriger: compter('a_corriger') },
    };
  }, [file, requete]);
}
