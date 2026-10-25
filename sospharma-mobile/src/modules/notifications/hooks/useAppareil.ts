import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { definirJetonAppareil, donneesOuErreur, lireJetonAppareil } from '@/commun/api';
import { alerte, signalerErreur, stockage, t, usePreferences } from '@/commun/lib';
import { useZoneCourante } from '@/modules/territoire';

import { enregistrerAppareil, modifierAppareil } from '../api';
import { configurerNotifications, obtenirJetonExpo } from '../notifications';

const CLE_IDENTIFIANT = 'appareil.identifiant';

function identifiantAnonyme(): string {
  let id = stockage().getString(CLE_IDENTIFIANT);
  if (!id) {
    id = `app_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    stockage().set(CLE_IDENTIFIANT, id);
  }
  return id;
}

/**
 * Enregistre l'appareil auprès de l'API au premier lancement (identifiant anonyme,
 * ville suivie), puis tient la ville suivie à jour. Aucun compte, aucune position.
 */
export function useEnregistrementAppareil(): void {
  const { villeId } = useZoneCourante();
  const derniereVille = useRef<string | null>(null);

  useEffect(() => {
    void configurerNotifications();
  }, []);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        if (!lireJetonAppareil()) {
          const { jeton } = await obtenirJetonExpo(false);
          const r = await enregistrerAppareil({
            identifiant: identifiantAnonyme(),
            jeton_expo: jeton,
            ville_suivie: villeId,
            plateforme: Platform.OS,
          });
          if (!annule && r.success) definirJetonAppareil(r.data.jeton);
          derniereVille.current = villeId;
        } else if (villeId && villeId !== derniereVille.current) {
          derniereVille.current = villeId;
          await modifierAppareil({ ville_suivie: villeId });
        }
      } catch (e) {
        signalerErreur(e, { etape: 'enregistrementAppareil' });
      }
    })();
    return () => {
      annule = true;
    };
  }, [villeId]);
}

/** Préférence « Nouveau tour de garde » (notification du samedi matin). */
export function useNotificationGarde() {
  const actif = usePreferences((e) => e.notificationGarde);
  const definir = usePreferences((e) => e.definirNotificationGarde);
  const mutation = useMutation({
    mutationFn: async (valeur: boolean) => {
      const { jeton, refuse } = valeur ? await obtenirJetonExpo(true) : { jeton: null, refuse: false };
      if (refuse) alerte(t('profil.notifTitre'), t('profil.notifRefusee'));
      return donneesOuErreur(
        await modifierAppareil({ notification_garde: valeur, ...(jeton ? { jeton_expo: jeton } : {}) }),
      );
    },
    onMutate: (valeur) => definir(valeur),
    onError: (_e, valeur) => definir(!valeur),
  });
  const basculer = useCallback((valeur: boolean) => mutation.mutate(valeur), [mutation]);
  return { actif, basculer, enCours: mutation.isPending };
}
