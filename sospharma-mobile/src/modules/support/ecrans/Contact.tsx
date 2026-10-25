import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { SujetSupport } from '@/commun/api';
import { alerte, appeler, ecrireEmail, ecrireWhatsApp, signalerErreur, t } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  Ecran,
  EnTete,
  HiPhone,
  IconeAppareilPhoto,
  IconeBulle,
  IconeEnveloppe,
  PiedFixe,
  Texte,
  useRetour,
  ZoneTexte,
} from '@/commun/ui';

import { useCoordonneesSupport, useEnvoyerMessage } from '../hooks/useSupport';

const SUJETS: SujetSupport[] = ['app', 'pharma', 'idee', 'autre'];

/** 18 Nous contacter. */
function Contact() {
  const retour = useRetour();
  const { couleurs: c } = useTheme();
  const { support, indicatif } = useCoordonneesSupport();
  const [sujet, setSujet] = useState<SujetSupport>('app');
  const [message, setMessage] = useState('');
  const [capture, setCapture] = useState<string | null>(null);
  const envoi = useEnvoyerMessage();

  const indisponible = () => alerte(t('contact.titre'), t('contact.indisponible'));

  const choisirCapture = async () => {
    if (capture) return setCapture(null);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!r.canceled && r.assets[0]) setCapture(r.assets[0].uri);
    } catch (e) {
      signalerErreur(e, { etape: 'capture' });
    }
  };

  const envoyer = () => {
    // Même minimum que l'API (EnvoyerMessageRequest : 10 caractères).
    if (message.trim().length < 10) return alerte(t('contact.titre'), t('contact.messageVide'));
    envoi.mutate(
      { corps: { sujet, message: message.trim(), contact: null }, capture },
      {
        onSuccess: () =>
          alerte(t('contact.merciTitre'), t('contact.merci'), [{ text: t('commun.ok'), onPress: retour }]),
      },
    );
  };

  return (
    <Ecran testID="ecran-contact">
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          <EnTete titre={t('contact.titre')} onRetour={retour} />
          <Texte variante="corps" couleur={c.texteSecondaire}>
            {t('contact.intro')}
          </Texte>

          <View style={styles.canaux}>
            <Pressable
              onPress={() => (support?.whatsapp ? ecrireWhatsApp(support.whatsapp, undefined, indicatif) : indisponible())}
              accessibilityRole="button"
              accessibilityLabel={`${t('contact.whatsapp')}, ${t('contact.rapide')}`}
              style={({ pressed }) => [styles.whatsapp, { backgroundColor: c.vert, opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={[styles.rond, { backgroundColor: c.blanc }]}>
                <IconeBulle size={22} color={c.vert} />
              </View>
              <View style={styles.flex}>
                <Texte variante="nomGrand" couleur={c.blanc}>
                  {t('contact.whatsapp')}
                </Texte>
                <Texte variante="petit" couleur={c.blanc}>
                  {t('contact.rapide')}
                </Texte>
              </View>
            </Pressable>
            <View style={styles.deux}>
              <Pressable
                onPress={() => (support?.telephone ? appeler(support.telephone, indicatif) : indisponible())}
                accessibilityRole="button"
                style={[styles.canal, { backgroundColor: c.surface }]}
              >
                <HiPhone size={20} color={c.pastilleActionIcone} />
                <Texte variante="boutonPetit">{t('contact.appeler')}</Texte>
              </Pressable>
              <Pressable
                onPress={() => (support?.email ? ecrireEmail(support.email, t('contact.titre')) : indisponible())}
                accessibilityRole="button"
                style={[styles.canal, { backgroundColor: c.surface }]}
              >
                <IconeEnveloppe size={20} color={c.pastilleActionIcone} />
                <Texte variante="boutonPetit">{t('contact.email')}</Texte>
              </Pressable>
            </View>
          </View>

          <View style={styles.formulaire}>
            <Texte variante="sectionMoyenne" titre>
              {t('contact.ouMessage')}
            </Texte>
            <View style={styles.sujets} accessibilityRole="radiogroup" accessibilityLabel={t('contact.sujetA11y')}>
              {SUJETS.map((s) => {
                const actif = s === sujet;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSujet(s)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: actif }}
                    style={[styles.sujet, { backgroundColor: actif ? c.filtreSelection : c.filtreFond }]}
                  >
                    <Texte variante="boutonPetit" couleur={actif ? c.filtreSelectionTexte : c.filtreTexte} style={styles.texte13} aligne="center">
                      {t(`contact.sujets.${s}`)}
                    </Texte>
                  </Pressable>
                );
              })}
            </View>
            <ZoneTexte
              libelle={t('contact.message')}
              placeholder={t('contact.placeholder')}
              lignes={4}
              value={message}
              onChangeText={setMessage}
              erreur={envoi.erreurs.message}
              maxLength={2000}
            />
            <Pressable onPress={choisirCapture} accessibilityRole="button" style={styles.capture}>
              <IconeAppareilPhoto size={20} color={c.vertTexte} strokeWidth={2} />
              <Texte variante="boutonPetit" couleur={c.vertTexte}>
                {capture ? t('contact.captureJointe') : t('contact.capture')}
              </Texte>
            </Pressable>
          </View>
        </ScrollView>
        <PiedFixe>
          <Bouton
            libelle={t('contact.envoyer')}
            icone="envoyer"
            hauteur={54}
            typo="boutonGrand"
            chargement={envoi.isPending}
            onPress={envoyer}
            testID="bouton-envoyer-message"
          />
        </PiedFixe>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  canaux: { gap: 8 },
  whatsapp: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  rond: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  deux: { flexDirection: 'row', gap: 8 },
  canal: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  formulaire: { gap: 10 },
  sujets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sujet: { width: '48.5%', minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  texte13: { fontSize: 13 },
  capture: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default avecErrorBoundary(Contact, 'Contact');
