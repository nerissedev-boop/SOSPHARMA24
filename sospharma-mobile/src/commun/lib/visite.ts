import { create } from 'zustand';

/**
 * « La pharmacie était-elle ouverte ? » : l'usager appelle une pharmacie ou part vers elle
 * (navigation, taxi), quitte l'app, puis revient. À son retour, on lui demande si elle était
 * ouverte ; « Non » envoie un signalement « fermée » (module Signalements).
 * Une seule question par pharmacie et par jour, et seulement après une vraie absence.
 */

/** Absence minimale hors de l'app : en deçà, l'appel n'a sans doute pas abouti. */
export const ABSENCE_MIN_VISITE_MS = 15_000;

export type Visite = { id: string; nom: string; depuis: number };

type EtatVisite = {
  /** Pharmacie appelée ou rejointe, en attente du retour dans l'app. */
  enCours: Visite | null;
  /** Question à poser maintenant (feuille affichée). */
  aDemander: Visite | null;
  /** Pharmacies déjà interrogées : identifiant → jour (toDateString). */
  dejaDemandees: Record<string, string>;
  commencer: (pharmacie: { id: string; nom: string }, maintenant?: number) => void;
  retourDansLApp: (maintenant?: number) => void;
  terminer: () => void;
};

const jour = (instant: number) => new Date(instant).toDateString();

export const useVisite = create<EtatVisite>()((set, get) => ({
  enCours: null,
  aDemander: null,
  dejaDemandees: {},
  commencer: ({ id, nom }, maintenant = Date.now()) => {
    if (get().dejaDemandees[id] === jour(maintenant)) return;
    set({ enCours: { id, nom, depuis: maintenant } });
  },
  retourDansLApp: (maintenant = Date.now()) => {
    const { enCours, dejaDemandees } = get();
    if (!enCours) return;
    if (maintenant - enCours.depuis < ABSENCE_MIN_VISITE_MS) return set({ enCours: null });
    set({ enCours: null, aDemander: enCours, dejaDemandees: { ...dejaDemandees, [enCours.id]: jour(maintenant) } });
  },
  terminer: () => set({ aDemander: null }),
}));

/** Raccourci hors React (actions d'appel et de navigation). */
export function commencerVisite(pharmacie: { id: string; nom: string }): void {
  useVisite.getState().commencer(pharmacie);
}
