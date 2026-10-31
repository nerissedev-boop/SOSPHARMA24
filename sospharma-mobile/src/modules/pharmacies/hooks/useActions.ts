import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import type { PharmacieResume } from '@/commun/api';
import { alerte, appeler, commencerVisite, ecrireWhatsApp, t } from '@/commun/lib';
import { usePaysCourant } from '@/modules/territoire';

type Cible = Pick<PharmacieResume, 'id' | 'telephone' | 'whatsapp'> & { nom?: string };

/** Actions communes sur une pharmacie : fiche, appel, WhatsApp, itinéraire. */
export function useActionsPharmacie() {
  const router = useRouter();
  const { pays } = usePaysCourant();
  return useMemo(
    () => ({
      ouvrir: (p: Cible) => router.push({ pathname: '/pharmacie/[id]', params: { id: p.id } }),
      itineraire: (p: Cible) => router.push({ pathname: '/pharmacie/[id]/itineraire', params: { id: p.id } }),
      appeler: (p: Cible) => {
        if (!p.telephone) return alerte(t('commun.appeler'), t('fiche.sansTelephone'));
        // Au retour dans l'app, on demandera si la pharmacie était ouverte.
        if (p.nom) commencerVisite({ id: p.id, nom: p.nom });
        void appeler(p.telephone, pays?.indicatif);
      },
      whatsapp: (p: Cible) => {
        if (!p.whatsapp) return alerte(t('commun.whatsapp'), t('fiche.sansWhatsapp'));
        void ecrireWhatsApp(p.whatsapp, undefined, pays?.indicatif);
      },
    }),
    [router, pays?.indicatif],
  );
}
