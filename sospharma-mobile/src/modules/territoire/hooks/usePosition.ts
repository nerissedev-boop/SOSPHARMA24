import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { positionSimulee, signalerErreur, useSession, type Coordonnees } from '@/commun/lib';

import type { PermissionPosition } from '../types';

/**
 * Position GPS (expo-location). La position n'est jamais enregistrée ni envoyée
 * ailleurs qu'aux recherches. En mode démo, une position simulée à Cocody est utilisée
 * (EXPO_PUBLIC_POSITION_SIMULEE) pour que les données fictives d'Abidjan s'affichent.
 */
export function usePosition() {
  const position = useSession((e) => e.position);
  const definirPosition = useSession((e) => e.definirPosition);
  const [permission, setPermission] = useState<PermissionPosition>('inconnue');
  const [enCours, setEnCours] = useState(false);

  const actualiser = useCallback(
    async (demander = false): Promise<Coordonnees | null> => {
      setEnCours(true);
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED && demander) {
          status = (await Location.requestForegroundPermissionsAsync()).status;
        }
        const accordee = status === Location.PermissionStatus.GRANTED;
        setPermission(accordee ? 'accordee' : status === Location.PermissionStatus.DENIED ? 'refusee' : 'inconnue');
        if (!accordee) return null;
        const simulee = positionSimulee();
        if (simulee) {
          definirPosition(simulee);
          return simulee;
        }
        const derniere = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        const lue = derniere ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        const p = { latitude: lue.coords.latitude, longitude: lue.coords.longitude };
        definirPosition(p);
        return p;
      } catch (e) {
        signalerErreur(e, { etape: 'position' });
        return null;
      } finally {
        setEnCours(false);
      }
    },
    [definirPosition],
  );

  useEffect(() => {
    if (position) return;
    const minuterie = setTimeout(() => void actualiser(false), 0);
    return () => clearTimeout(minuterie);
    // Lecture silencieuse au montage seulement (sans demander la permission).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { position, permission, enCours, actualiser };
}
