import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { alerte, appliquerLangue, estModeDemo, t, usePreferences, type ModeNuit, type PreferenceLangue } from '@/commun/lib';
import { CIBLE_TACTILE, espacements, rayons, useTheme } from '@/commun/theme';
import { avecErrorBoundary, Ecran, Filtre, IconeChevronDroite, LigneMenu, revenirAuLogo, Texte } from '@/commun/ui';
import { useNotificationGarde } from '@/modules/notifications';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { CarteFavoris } from '../composants/CarteFavoris';
import { GroupeReglages } from '../composants/GroupeReglages';

const MODES: ModeNuit[] = ['auto', 'jour', 'nuit'];
/** Chaque langue s'écrit dans sa propre langue (« English » même en français). */
const NOM_LANGUE: Record<PreferenceLangue, () => string> = {
  auto: () => t('profil.langueAuto'),
  fr: () => t('profil.francais'),
  en: () => t('profil.anglais'),
};

/**
 * 14 Profil (refonte v2, 14 nov.) : ni bandeau ni avatar, il n'y a pas de compte. L'ordre suit
 * l'usage : mes pharmacies, mes assurances, préférences, aide. Le mode nuit montre ses trois choix
 * (Auto, Jour, Nuit), les mêmes filtres que partout.
 */
function Profil() {
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const modeNuit = usePreferences((e) => e.modeNuit);
  const definirModeNuit = usePreferences((e) => e.definirModeNuit);
  const { zone } = useZoneCourante();
  const { pays } = usePaysCourant();
  const notification = useNotificationGarde();
  const mesAssurances = usePreferences((e) => e.mesAssurances);
  const langue = usePreferences((e) => e.langue);
  const definirLangue = usePreferences((e) => e.definirLangue);
  const clientRequetes = useQueryClient();
  const modifierAssurances = () => router.push({ pathname: '/assurances', params: { contexte: 'profil' } });

  // Les écrans lisent leurs textes à l'affichage : on repasse par le logo pour tout reconstruire,
  // et on recharge les données dont l'API fournit des textes (résumés, messages).
  const changerLangue = (choix: PreferenceLangue) => {
    if (choix === langue) return;
    definirLangue(choix);
    appliquerLangue(choix);
    void clientRequetes.invalidateQueries();
    revenirAuLogo();
  };
  const choisirLangue = () =>
    alerte(t('profil.langue'), t('profil.langueTexte'), [
      // Le choix actuel d'abord : c'est lui qui ressort en vert plein.
      ...([langue, ...(['fr', 'en', 'auto'] as const).filter((l) => l !== langue)] as PreferenceLangue[]).map((choix) => ({
        text: choix === langue ? `${NOM_LANGUE[choix]()} ✓` : NOM_LANGUE[choix](),
        onPress: () => changerLangue(choix),
      })),
      { text: t('commun.annuler'), style: 'cancel' as const },
    ]);

  return (
    <Ecran testID="ecran-profil">
      <ScrollView contentContainerStyle={styles.contenu} testID="defilement-profil">
        <Texte variante="titreEcran" titre style={styles.titre}>
          {t('profil.titre')}
        </Texte>

        <Texte variante="section" titre style={styles.etiquette}>
          {t('profil.mesPharmacies')}
        </Texte>
        <CarteFavoris />

        <Texte variante="section" titre style={styles.etiquette}>
          {t('profil.mesAssurances')}
        </Texte>
        <View style={[styles.assurances, { backgroundColor: c.carte }]} testID="groupe-assurances">
          <View style={styles.rangeeAssurances}>
            <View style={styles.puces}>
              {mesAssurances.length > 0 ? (
                mesAssurances.map((a) => (
                  <View key={a.slug} style={[styles.puce, { backgroundColor: c.puceForteFond }]}>
                    <Texte variante="libelleFort" couleur={c.puceForteTexte}>
                      {a.nom}
                    </Texte>
                  </View>
                ))
              ) : (
                <Texte variante="corps" couleur={c.texteSecondaire}>
                  {t('profil.aucune')}
                </Texte>
              )}
            </View>
            <Pressable onPress={modifierAssurances} accessibilityRole="button" accessibilityLabel={t('profil.modifierAssurances')} style={styles.lien} testID="ligne-mes-assurances">
              <Texte variante="boutonPetit" couleur={c.vertTexte}>
                {t('profil.modifier')}
              </Texte>
            </Pressable>
          </View>
          <Texte variante="petit" couleur={c.texteSecondaire}>
            {t('profil.assurancesTexte')}
          </Texte>
        </View>

        <GroupeReglages titre={t('profil.preferences')} style={styles.groupe} testID="groupe-preferences">
          <LigneMenu libelle={t('profil.communeDefaut')} valeur={zone?.nom ?? t('profil.aucune')} onPress={() => router.push('/zone')} />
          <LigneMenu libelle={t('profil.pays')} valeur={pays?.nom ?? ''} onPress={() => router.push('/zone/pays')} />
          <View style={styles.modeNuit} testID="ligne-mode-nuit">
            <View style={styles.textesMode}>
              <Texte variante="corps">{t('profil.modeNuit')}</Texte>
              <Texte variante="libelle" couleur={c.texteSecondaire}>
                {t('profil.modeNuitAuto')}
              </Texte>
            </View>
            <View style={styles.modes} accessibilityRole="radiogroup" accessibilityLabel={t('profil.modeNuit')}>
              {MODES.map((mode) => (
                <Filtre
                  key={mode}
                  libelle={t(`profil.modes.${mode}`)}
                  selectionne={modeNuit === mode}
                  onPress={() => definirModeNuit(mode)}
                  paddingHorizontal={12}
                  testID={`mode-${mode}`}
                />
              ))}
            </View>
          </View>
          <LigneMenu libelle={t('profil.langue')} valeur={NOM_LANGUE[langue]()} onPress={choisirLangue} testID="ligne-langue" />
          {/* Refus de l'autorisation : le message est donné par useNotificationGarde (réglages du téléphone). */}
          <LigneMenu
            libelle={t('profil.notifTitre')}
            sousTitre={t('profil.notifTexte')}
            droite={
              <Switch
                value={notification.actif}
                onValueChange={notification.basculer}
                trackColor={{ false: c.etapeInactive, true: c.vert }}
                thumbColor={c.blanc}
                accessibilityLabel={t('profil.notifTitre')}
                testID="case-notification-garde"
              />
            }
          />
        </GroupeReglages>

        <GroupeReglages titre={t('profil.aide')} style={styles.groupe} testID="groupe-aide">
          <LigneMenu libelle={t('profil.contact')} onPress={() => router.push('/contact')} testID="lien-contact" />
          <LigneMenu libelle={t('profil.proposer')} onPress={() => router.push('/proposer')} testID="lien-proposer" />
        </GroupeReglages>

        {/* Entrée des agents et pharmaciens : discrète, sous les réglages du public. */}
        <View style={styles.pied}>
          <Pressable
            onPress={() => router.push('/agent/connexion')}
            accessibilityRole="link"
            style={({ pressed }) => [styles.lienAgent, { opacity: pressed ? 0.7 : 1 }]}
            testID="lien-espace-agent"
          >
            <Texte variante="petit" couleur={c.texteSecondaire}>
              {t('profil.espaceAgent')}
            </Texte>
            <IconeChevronDroite size={14} color={c.texteSecondaire} strokeWidth={2.4} />
          </Pressable>
          {estModeDemo() ? (
            <Texte variante="libelle" couleur={c.texteTertiaire}>
              {t('profil.demo')}
            </Texte>
          ) : null}
        </View>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: espacements.gouttiere, paddingBottom: 24 },
  titre: { paddingTop: 24, paddingHorizontal: 4 },
  etiquette: { marginTop: 20, marginBottom: 8, paddingHorizontal: 4 },
  assurances: { paddingHorizontal: 16, paddingVertical: 12, gap: 6, borderRadius: rayons.surface },
  rangeeAssurances: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  puces: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  puce: { minHeight: 28, paddingHorizontal: 10, justifyContent: 'center', borderRadius: rayons.repere },
  lien: { minHeight: CIBLE_TACTILE, justifyContent: 'center' },
  groupe: { marginTop: 20 },
  modeNuit: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 60, paddingVertical: 8 },
  textesMode: { flexGrow: 1, flexShrink: 1, gap: 2 },
  modes: { flexDirection: 'row', gap: 6 },
  pied: { marginTop: 12, marginHorizontal: 4, gap: 4 },
  lienAgent: { minHeight: CIBLE_TACTILE, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
});

export default avecErrorBoundary(Profil, 'Profil');
