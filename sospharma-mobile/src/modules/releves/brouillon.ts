import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PharmacieResume, PlageHoraire } from '@/commun/api';
import { stockageSynchrone, useSelectionAssurances } from '@/commun/lib';

import { HORAIRES_DEFAUT } from './horaires';
import { nouvelIdentifiantReleve } from './identifiant';
import type { PhotoLocale, PositionReleve, TypePhotoReleve, TypeReleve } from './types';

/** Relevé en cours de saisie (4 étapes). Gardé dans MMKV : rien n'est perdu si l'app se ferme. */
export type ChampsBrouillon = {
  nom: string;
  /** Adresse ou repère (« face au marché ») : obligatoire pour une nouvelle pharmacie (API). */
  adresse: string;
  telephone: string;
  whatsapp: string;
  horaires: PlageHoraire[];
  h24: boolean;
  services: string[];
};

type Pharmacie = Pick<PharmacieResume, 'id' | 'nom' | 'adresse' | 'telephone' | 'whatsapp' | 'horaires' | 'h24' | 'assurances'> & {
  services?: string[];
};

type EtatBrouillon = {
  id: string;
  type: TypeReleve;
  pharmacieId: string | null;
  /** Vrai si le relevé part d'une fiche (« Mettre à jour ») : l'étape des doublons est sautée. */
  depuisFiche: boolean;
  position: PositionReleve | null;
  zone: { id: string; nom: string; ville: string } | null;
  photos: Partial<Record<TypePhotoReleve, PhotoLocale>>;
  champs: ChampsBrouillon;
  debutLe: string;
  demarrer: (pharmacie?: Pharmacie | null) => void;
  definirPosition: (position: PositionReleve, zone: EtatBrouillon['zone']) => void;
  choisirExistante: (pharmacie: Pharmacie) => void;
  choisirNouvelle: () => void;
  definirPhoto: (type: TypePhotoReleve, photo: PhotoLocale | null) => void;
  modifierChamps: (partiel: Partial<ChampsBrouillon>) => void;
};

const CHAMPS_VIDES: ChampsBrouillon = { nom: '', adresse: '', telephone: '', whatsapp: '', horaires: HORAIRES_DEFAUT, h24: false, services: [] };

function champsDepuis(p: Pharmacie): ChampsBrouillon {
  return {
    nom: p.nom,
    adresse: p.adresse ?? '',
    telephone: p.telephone ?? '',
    whatsapp: p.whatsapp && p.whatsapp !== p.telephone ? p.whatsapp : '',
    horaires: p.horaires.length ? p.horaires : HORAIRES_DEFAUT,
    h24: p.h24,
    services: p.services ?? [],
  };
}

function deposerAssurances(slugs: string[]) {
  const { definir, definirProposees } = useSelectionAssurances.getState();
  definir('releve', slugs);
  definirProposees('releve', []);
}

export const useBrouillonReleve = create<EtatBrouillon>()(
  persist(
    (set) => ({
      id: nouvelIdentifiantReleve(),
      type: 'creation',
      pharmacieId: null,
      depuisFiche: false,
      position: null,
      zone: null,
      photos: {},
      champs: CHAMPS_VIDES,
      debutLe: new Date().toISOString(),
      demarrer: (pharmacie) => {
        deposerAssurances(pharmacie ? pharmacie.assurances.map((a) => a.slug) : []);
        set({
          id: nouvelIdentifiantReleve(),
          type: pharmacie ? 'mise_a_jour' : 'creation',
          pharmacieId: pharmacie?.id ?? null,
          depuisFiche: Boolean(pharmacie),
          position: null,
          zone: null,
          photos: {},
          champs: pharmacie ? champsDepuis(pharmacie) : CHAMPS_VIDES,
          debutLe: new Date().toISOString(),
        });
      },
      definirPosition: (position, zone) => set({ position, zone }),
      choisirExistante: (pharmacie) => {
        deposerAssurances(pharmacie.assurances.map((a) => a.slug));
        set({ type: 'mise_a_jour', pharmacieId: pharmacie.id, champs: champsDepuis(pharmacie) });
      },
      choisirNouvelle: () => set((e) => ({ type: 'creation', pharmacieId: null, champs: e.type === 'mise_a_jour' ? CHAMPS_VIDES : e.champs })),
      definirPhoto: (type, photo) =>
        set((e) => {
          const photos = { ...e.photos };
          if (photo) photos[type] = photo;
          else delete photos[type];
          return { photos };
        }),
      modifierChamps: (partiel) => set((e) => ({ champs: { ...e.champs, ...partiel } })),
    }),
    {
      name: 'releves.brouillon',
      version: 1,
      storage: createJSONStorage(() => stockageSynchrone),
      partialize: ({ id, type, pharmacieId, depuisFiche, position, zone, photos, champs, debutLe }) => ({
        id,
        type,
        pharmacieId,
        depuisFiche,
        position,
        zone,
        photos,
        champs,
        debutLe,
      }),
    },
  ),
);
