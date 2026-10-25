import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { positionSimulee, signalerErreur } from '@/commun/lib';

/** Au-delà de cette précision (en mètres), le relevé est refusé (architecture). */
export const PRECISION_MAX_M = 30;

export type EtatPosition =
  | { statut: 'attente' }
  | { statut: 'refusee' }
  | { statut: 'erreur' }
  | { statut: 'ok'; latitude: number; longitude: number; precision: number };

/**
 * Position en haute précision (expo-location), suivie en continu pendant l'étape 1 du relevé
 * seulement : l'autorisation est demandée ici, pas avant. En démo, position simulée (± 8 m).
 */
export function usePositionPrecise() {
  const [etat, setEtat] = useState<EtatPosition>({ statut: 'attente' });
  const abonnement = useRef<Location.LocationSubscription | null>(null);

  const demarrer = useCallback(async () => {
    abonnement.current?.remove();
    abonnement.current = null;
    setEtat({ statut: 'attente' });
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) status = (await Location.requestForegroundPermissionsAsync()).status;
      if (status !== Location.PermissionStatus.GRANTED) {
        setEtat({ statut: 'refusee' });
        return;
      }
      const simulee = positionSimulee();
      if (simulee) {
        setEtat({ statut: 'ok', ...simulee, precision: 8 });
        return;
      }
      abonnement.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0 },
        (lieu) =>
          setEtat({
            statut: 'ok',
            latitude: lieu.coords.latitude,
            longitude: lieu.coords.longitude,
            precision: Math.round(lieu.coords.accuracy ?? 999),
          }),
      );
    } catch (e) {
      signalerErreur(e, { etape: 'position-releve' });
      setEtat({ statut: 'erreur' });
    }
  }, []);

  useEffect(() => {
    const minuterie = setTimeout(() => void demarrer(), 0);
    return () => {
      clearTimeout(minuterie);
      abonnement.current?.remove();
      abonnement.current = null;
    };
  }, [demarrer]);

  return { etat, relancer: demarrer };
}
