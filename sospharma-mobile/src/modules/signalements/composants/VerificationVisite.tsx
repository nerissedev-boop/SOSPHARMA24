import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { donneesOuErreur, useReactionErreur } from '@/commun/api';
import { alerte, t, useVisite, vibrationSucces } from '@/commun/lib';
import { Bouton, Feuille } from '@/commun/ui';

import { envoyerSignalement } from '../api';

/**
 * Au retour dans l'app après un appel ou un trajet vers une pharmacie : « Était-elle ouverte ? ».
 * « Non, c'était fermé » envoie un signalement « fermée » en un appui. Posé une fois à la racine.
 */
export function VerificationVisite() {
  const aDemander = useVisite((e) => e.aDemander);
  const retourDansLApp = useVisite((e) => e.retourDansLApp);
  const terminer = useVisite((e) => e.terminer);
  const reagir = useReactionErreur();
  // L'identifiant voyage avec l'envoi : la feuille se ferme avant que la requête parte.
  const envoi = useMutation({
    mutationFn: async (pharmacieId: string) =>
      donneesOuErreur(await envoyerSignalement(pharmacieId, { motif: 'fermee', precisions: t('visite.precisions') })),
    onSuccess: () => {
      vibrationSucces();
      alerte(t('visite.merciTitre'), t('visite.merciTexte'));
    },
    onError: (erreur) => void reagir(erreur),
  });
  const etat = useRef(AppState.currentState);

  useEffect(() => {
    const abonnement = AppState.addEventListener('change', (suivant) => {
      if (etat.current !== 'active' && suivant === 'active') retourDansLApp();
      etat.current = suivant;
    });
    return () => abonnement.remove();
  }, [retourDansLApp]);

  const fermee = () => {
    if (aDemander) envoi.mutate(aDemander.id);
    terminer();
  };

  return (
    <Feuille
      visible={aDemander !== null}
      onFermer={terminer}
      titre={aDemander ? t('visite.titre', { nom: aDemander.nom }) : undefined}
      message={t('visite.texte')}
      testID="feuille-visite"
      pied={
        <View style={styles.boutons}>
          <Bouton libelle={t('visite.ouverte')} onPress={terminer} testID="visite-ouverte" />
          <Bouton libelle={t('visite.fermee')} variante="danger" onPress={fermee} testID="visite-fermee" />
          <Bouton libelle={t('visite.pasAllee')} variante="lien" onPress={terminer} testID="visite-pas-allee" />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  boutons: { gap: 10 },
});
