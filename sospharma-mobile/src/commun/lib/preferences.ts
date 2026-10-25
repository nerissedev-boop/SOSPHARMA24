import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { estModeDemo } from './config';
import { stockageSynchrone } from './stockage';

export type ModeNuit = 'auto' | 'jour' | 'nuit';
/** Rayons proposés. 5 km au plus : c'est la limite de l'API (architecture validée), la maquette proposait aussi 10 km. */
export type RayonKm = 1 | 2 | 5;
export type FiltreRapide = 'toutes' | 'ouvertes' | 'garde';

export type Filtres = {
  ouvertes: boolean;
  garde: boolean;
  h24: boolean;
  rayonKm: RayonKm;
  assurances: string[];
};

/** Zone choisie par l'usager (sa position détectée ou une commune choisie à la main). */
export type ZoneChoisie = {
  zoneId: string;
  nom: string;
  villeId: string;
  villeNom: string;
  latitude: number;
  longitude: number;
  source: 'position' | 'manuelle';
};

/** Assurance enregistrée par l'usager (« Mes assurances ») : slug pour les filtres, nom pour l'affichage. */
export type AssuranceChoisie = { slug: string; nom: string };

/** Profil local : reste sur le téléphone, n'est jamais envoyé à l'API. */
export type ProfilLocal = { prenom: string; nom: string; telephone: string };

export const FILTRES_PAR_DEFAUT: Filtres = {
  ouvertes: false,
  garde: false,
  h24: false,
  rayonKm: 5,
  assurances: [],
};

/** Profil de démonstration (maquettes), utilisé seulement avec l'adaptateur de démo. */
const PROFIL_DEMO: ProfilLocal = { prenom: 'Amani', nom: 'Kouadio', telephone: '+225 07 77 88 99 00' };
/** « Mes assurances » du profil de démonstration (maquette Profil : « MUGEF-CI, CMU »). */
const ASSURANCES_DEMO: AssuranceChoisie[] = [
  { slug: 'mugef-ci', nom: 'MUGEF-CI' },
  { slug: 'cmu', nom: 'CMU' },
];

type EtatPreferences = {
  paysCode: string;
  zone: ZoneChoisie | null;
  modeNuit: ModeNuit;
  filtres: Filtres;
  filtreRapide: FiltreRapide;
  profil: ProfilLocal;
  notificationGarde: boolean;
  derniereFiche: string | null;
  localisationDemandee: boolean;
  paysPrevenus: string[];
  villesPrevenues: string[];
  notificationsVues: string | null;
  /** « Mes assurances » : enregistrées sur le téléphone puis synchronisées (PUT /appareils/moi/assurances). */
  mesAssurances: AssuranceChoisie[];
  mesAssurancesSynchronisees: boolean;
  /** Vrai dès que l'usager a validé des filtres d'assurance (sinon le modal reprend « Mes assurances »). */
  assurancesFiltreChoisies: boolean;
  definirPays: (code: string) => void;
  definirZone: (zone: ZoneChoisie | null) => void;
  definirModeNuit: (mode: ModeNuit) => void;
  definirFiltres: (filtres: Filtres) => void;
  definirFiltreRapide: (filtre: FiltreRapide) => void;
  reinitialiserFiltres: () => void;
  definirProfil: (profil: ProfilLocal) => void;
  definirNotificationGarde: (actif: boolean) => void;
  definirDerniereFiche: (id: string) => void;
  marquerLocalisationDemandee: () => void;
  basculerPaysPrevenu: (code: string) => void;
  ajouterVillePrevenue: (nom: string) => void;
  marquerNotificationsVues: (cle: string) => void;
  definirMesAssurances: (liste: AssuranceChoisie[]) => void;
  marquerMesAssurancesSynchronisees: () => void;
};

export const usePreferences = create<EtatPreferences>()(
  persist(
    (set) => ({
      paysCode: 'CI',
      zone: null,
      modeNuit: 'auto',
      filtres: FILTRES_PAR_DEFAUT,
      filtreRapide: 'toutes',
      profil: estModeDemo() ? PROFIL_DEMO : { prenom: '', nom: '', telephone: '' },
      notificationGarde: true,
      derniereFiche: null,
      localisationDemandee: false,
      paysPrevenus: [],
      villesPrevenues: [],
      notificationsVues: null,
      mesAssurances: estModeDemo() ? ASSURANCES_DEMO : [],
      // En démo, la liste préremplie est envoyée à l'adaptateur au premier lancement.
      mesAssurancesSynchronisees: !estModeDemo(),
      assurancesFiltreChoisies: false,
      definirPays: (paysCode) => set({ paysCode }),
      definirZone: (zone) => set({ zone }),
      definirModeNuit: (modeNuit) => set({ modeNuit }),
      definirFiltres: (filtres) => set({ filtres, assurancesFiltreChoisies: true }),
      definirFiltreRapide: (filtreRapide) => set({ filtreRapide }),
      reinitialiserFiltres: () => set({ filtres: FILTRES_PAR_DEFAUT, filtreRapide: 'toutes', assurancesFiltreChoisies: false }),
      definirProfil: (profil) => set({ profil }),
      definirNotificationGarde: (notificationGarde) => set({ notificationGarde }),
      definirDerniereFiche: (derniereFiche) => set({ derniereFiche }),
      marquerLocalisationDemandee: () => set({ localisationDemandee: true }),
      basculerPaysPrevenu: (code) =>
        set((e) => ({
          paysPrevenus: e.paysPrevenus.includes(code)
            ? e.paysPrevenus.filter((c) => c !== code)
            : [...e.paysPrevenus, code],
        })),
      ajouterVillePrevenue: (nom) =>
        set((e) => ({ villesPrevenues: e.villesPrevenues.includes(nom) ? e.villesPrevenues : [...e.villesPrevenues, nom] })),
      marquerNotificationsVues: (notificationsVues) => set({ notificationsVues }),
      definirMesAssurances: (mesAssurances) => set({ mesAssurances, mesAssurancesSynchronisees: false }),
      marquerMesAssurancesSynchronisees: () => set({ mesAssurancesSynchronisees: true }),
    }),
    {
      name: 'preferences',
      version: 3,
      // v1 -> v2 : « Mes assurances » ; les anciens codes d'assurance des filtres (config pays) sont retirés.
      // v2 -> v3 : le rayon de 10 km disparaît (limite de l'API : 5 km).
      migrate: (etat, version) => {
        const e = (etat ?? {}) as Partial<EtatPreferences>;
        if (version < 2 && e.filtres) e.filtres = { ...e.filtres, assurances: [] };
        if (version < 3 && e.filtres && (e.filtres.rayonKm as number) > 5) e.filtres = { ...e.filtres, rayonKm: 5 };
        return e as EtatPreferences;
      },
      storage: createJSONStorage(() => stockageSynchrone),
    },
  ),
);

/** État de session, non persisté (le splash s'affiche à chaque lancement). */
type EtatSession = {
  demarrageFait: boolean;
  position: { latitude: number; longitude: number } | null;
  terminerDemarrage: () => void;
  definirPosition: (p: { latitude: number; longitude: number } | null) => void;
};

export const useSession = create<EtatSession>()((set) => ({
  demarrageFait: false,
  position: null,
  terminerDemarrage: () => set({ demarrageFait: true }),
  definirPosition: (position) => set({ position }),
}));
