import { create } from 'zustand';

/**
 * Sélection d'assurances en cours d'édition, partagée entre l'écran ChoixAssurances
 * (module Pharmacies) et l'écran qui l'ouvre : Filtres, Profil ou fiche de relevé.
 * L'écran appelant dépose la sélection de départ, le choix la remplace en validant.
 * Les valeurs sont des slugs d'assurance (« mugef-ci », « cmu »).
 */
export type ContexteAssurances = 'filtres' | 'profil' | 'releve';

type EtatSelection = {
  selections: Record<ContexteAssurances, string[]>;
  /** Noms libres proposés (« Assurance absente de la liste ? »), relevés seulement. */
  proposees: Record<ContexteAssurances, string[]>;
  definir: (contexte: ContexteAssurances, slugs: string[]) => void;
  definirProposees: (contexte: ContexteAssurances, noms: string[]) => void;
};

export const useSelectionAssurances = create<EtatSelection>()((set) => ({
  selections: { filtres: [], profil: [], releve: [] },
  proposees: { filtres: [], profil: [], releve: [] },
  definir: (contexte, slugs) => set((e) => ({ selections: { ...e.selections, [contexte]: [...new Set(slugs)] } })),
  definirProposees: (contexte, noms) => set((e) => ({ proposees: { ...e.proposees, [contexte]: [...new Set(noms)] } })),
}));

export function estContexteAssurances(v: unknown): v is ContexteAssurances {
  return v === 'filtres' || v === 'profil' || v === 'releve';
}
