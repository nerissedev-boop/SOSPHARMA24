import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { CleOnglet } from '../BarreOnglets';

export const CHEMINS_ONGLETS = {
  accueil: '/',
  carte: '/carte',
  urgence: '/urgence',
  garde: '/garde',
  profil: '/profil',
  releves: '/releves',
} as const satisfies Record<CleOnglet, string>;

/** Pour la barre d'onglets affichée seule (écrans hors onglets, comme dans les maquettes). */
export function useNavigationOnglets() {
  const router = useRouter();
  return useCallback((cle: CleOnglet) => router.navigate(CHEMINS_ONGLETS[cle]), [router]);
}
