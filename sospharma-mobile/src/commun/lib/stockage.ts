import { createMMKV, type MMKV } from 'react-native-mmkv';

/**
 * Stockage clé-valeur local (MMKV). Sert au cache TanStack Query (hors connexion),
 * aux préférences (Zustand) et au jeton d'appareil.
 */
let instance: MMKV | null = null;

export function stockage(): MMKV {
  if (!instance) {
    instance = createMMKV({ id: 'sospharma' });
  }
  return instance;
}

/** Adaptateur synchrone (getItem/setItem/removeItem) pour Zustand et TanStack Query. */
export const stockageSynchrone = {
  getItem: (cle: string): string | null => stockage().getString(cle) ?? null,
  setItem: (cle: string, valeur: string): void => {
    stockage().set(cle, valeur);
  },
  removeItem: (cle: string): void => {
    stockage().remove(cle);
  },
};
