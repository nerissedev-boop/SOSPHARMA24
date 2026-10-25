import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import type { PharmacieResume } from '@/commun/api';
import { alerte, config, ecrireWhatsApp, envoyerSms, lienPosition, marquerSortieVersAutreApp, minusculeInitiale, signalerErreur, t, telephoneAffiche } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { avecErrorBoundary, Bouton, Feuille, IconeBulle, IconeCopier, IconePoints, IconeSms, Texte, useRetour } from '@/commun/ui';
import { usePaysCourant } from '@/modules/territoire';

import { useLibelleStatut, usePharmacie } from '../hooks/usePharmacies';

/** Message de la maquette 16 : nom et statut, adresse, téléphone, lien d'itinéraire. */
export function messagePartage(
  p: Pick<PharmacieResume, 'id' | 'nom' | 'adresse' | 'telephone' | 'latitude' | 'longitude'>,
  statut: string,
  indicatif?: string,
): string {
  const lien = config.lienPartageBase
    ? `${config.lienPartageBase.replace(/\/$/, '')}/pharmacie/${p.id}`
    : lienPosition({ latitude: p.latitude, longitude: p.longitude });
  return [
    `${p.nom}, ${minusculeInitiale(statut)}`,
    p.adresse,
    p.telephone ? t('partage.telephone', { telephone: telephoneAffiche(p.telephone, indicatif) }) : null,
    t('partage.lien', { lien }),
  ]
    .filter(Boolean)
    .join('\n');
}

function Option({ libelle, icone, fond, onPress }: { libelle: string; icone: ReactNode; fond: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={libelle} style={styles.option}>
      <View style={[styles.rond, { backgroundColor: fond }]}>{icone}</View>
      <Texte variante="libelleMoyen">{libelle}</Texte>
    </Pressable>
  );
}

/** 16 Partager une pharmacie (modal posé sur la fiche). */
function Partage() {
  const retour = useRetour();
  const { couleurs: c } = useTheme();
  // La feuille joue son animation de fermeture, puis l'écran se retire.
  const [ouverte, setOuverte] = useState(true);
  useEffect(() => {
    if (ouverte) return undefined;
    const minuteur = setTimeout(retour, 200);
    return () => clearTimeout(minuteur);
  }, [ouverte, retour]);
  const fermer = () => setOuverte(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fiche } = usePharmacie(id ?? '');
  const { pays } = usePaysCourant();
  const libelleStatut = useLibelleStatut();
  const message = fiche ? messagePartage(fiche, libelleStatut(fiche), pays?.indicatif) : '';

  const autres = async () => {
    try {
      marquerSortieVersAutreApp();
      await Share.share({ message });
    } catch (e) {
      signalerErreur(e, { etape: 'partage' });
    }
  };

  return (
    <View style={styles.plein} testID="ecran-partage">
      <Feuille
        visible={ouverte}
        onFermer={fermer}
        titre={t('partage.titre')}
        croix={false}
        pied={<Bouton libelle={t('commun.annuler')} icone="annuler" variante="secondaire" typo="bouton" onPress={fermer} />}
      >
        <View style={[styles.message, { backgroundColor: c.surface }]}>
          <Texte variante="libelleFort" couleur={c.texteSecondaire}>
            {t('partage.messageEnvoye')}
          </Texte>
          <Texte variante="texte" style={styles.texteMessage} selectable>
            {message}
          </Texte>
        </View>
        <View style={styles.options}>
          <Option libelle={t('commun.whatsapp')} fond={c.vert} icone={<IconeBulle size={24} color={c.blanc} />} onPress={() => ecrireWhatsApp(null, message)} />
          <Option libelle={t('partage.sms')} fond={c.pastilleAction} icone={<IconeSms size={24} color={c.pastilleActionIcone} />} onPress={() => envoyerSms(message)} />
          <Option
            libelle={t('partage.copier')}
            fond={c.pastilleAction}
            icone={<IconeCopier size={24} color={c.pastilleActionIcone} />}
            onPress={async () => {
              await Clipboard.setStringAsync(message);
              alerte(t('partage.titre'), t('partage.copie'));
            }}
          />
          <Option libelle={t('partage.autres')} fond={c.pastilleAction} icone={<IconePoints size={24} color={c.pastilleActionIcone} />} onPress={autres} />
        </View>
      </Feuille>
    </View>
  );
}

const styles = StyleSheet.create({
  plein: { flex: 1 },
  message: { padding: 14, gap: 6 },
  texteMessage: { lineHeight: 22 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, alignItems: 'center', gap: 8 },
  rond: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});

export default avecErrorBoundary(Partage, 'Partage');
