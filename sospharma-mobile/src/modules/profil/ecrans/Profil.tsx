import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { alerte, appliquerLangue, estModeDemo, initiales, t, usePreferences, type ModeNuit, type PreferenceLangue } from '@/commun/lib';
import { CIBLE_TACTILE, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  CaseACocher,
  Ecran,
  HiUiUserProfile,
  IconeChevronDroite,
  LigneMenu,
  PressableAnime,
  revenirAuLogo,
  Texte,
} from '@/commun/ui';
import { useNotificationGarde } from '@/modules/notifications';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { CarteFavoris } from '../composants/CarteFavoris';
import { EditionProfil } from '../composants/EditionProfil';
import { GroupeReglages } from '../composants/GroupeReglages';

const CYCLE_MODE: Record<ModeNuit, ModeNuit> = { auto: 'nuit', nuit: 'jour', jour: 'auto' };
/** Chaque langue s'écrit dans sa propre langue (« English » même en français). */
const NOM_LANGUE: Record<PreferenceLangue, () => string> = {
  auto: () => t('profil.langueAuto'),
  fr: () => t('profil.francais'),
  en: () => t('profil.anglais'),
};
/** Bas du bandeau recouvert par la carte des favoris (piste A). */
const CHEVAUCHEMENT = 40;

/**
 * 14 Profil et favoris (piste A, 11 nov.) : bandeau vert profond (avatar, nom, « Modifier »),
 * carte des favoris qui chevauche son bas, puis les groupes « Préférences » et « Aide ».
 */
function Profil() {
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const [edition, setEdition] = useState(false);
  const profil = usePreferences((e) => e.profil);
  const definirProfil = usePreferences((e) => e.definirProfil);
  const modeNuit = usePreferences((e) => e.modeNuit);
  const definirModeNuit = usePreferences((e) => e.definirModeNuit);
  const { zone } = useZoneCourante();
  const { pays } = usePaysCourant();
  const notification = useNotificationGarde();
  const mesAssurances = usePreferences((e) => e.mesAssurances);
  const nomComplet = `${profil.prenom} ${profil.nom}`.trim();
  const lettres = initiales(profil.prenom, profil.nom);
  const langue = usePreferences((e) => e.langue);
  const definirLangue = usePreferences((e) => e.definirLangue);
  const clientRequetes = useQueryClient();

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
    // Fond vert profond : la zone de la barre d'état prolonge le bandeau ; la liste garde le fond sable.
    <Ecran testID="ecran-profil" fond={c.vertProfond} barreClaire>
      <ScrollView style={{ backgroundColor: c.fond }} contentContainerStyle={styles.contenu} testID="defilement-profil">
        <View style={[styles.bandeau, { backgroundColor: c.vertProfond }]} testID="bandeau-profil">
          {/* Liste tirée vers le bas (rebond iOS) : le vert continue au-dessus du bandeau. */}
          <View pointerEvents="none" style={[styles.prolongement, { backgroundColor: c.vertProfond }]} />
          {/* Avatar décoratif : le nom, juste à côté, est lu par le lecteur d'écran. */}
          <View
            style={[styles.avatar, { backgroundColor: c.vert }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="avatar-profil"
          >
            {lettres ? (
              <Texte variante="titre" couleur={c.blanc} maxFontSizeMultiplier={1.2}>
                {lettres}
              </Texte>
            ) : (
              <HiUiUserProfile size={30} color={c.blanc} />
            )}
          </View>
          <View style={styles.identite}>
            <Texte variante="titre" titre couleur={c.blanc} numberOfLines={2}>
              {nomComplet || t('profil.ajouterNom')}
            </Texte>
            <Texte variante="petit" couleur={c.vertTendre} numberOfLines={2}>
              {profil.telephone || t('profil.localSeulement')}
            </Texte>
          </View>
          <PressableAnime
            onPress={() => setEdition(true)}
            accessibilityRole="button"
            style={[styles.modifier, { backgroundColor: c.profilBandeauBouton }]}
            testID="bouton-modifier-profil"
          >
            <Texte variante="boutonPetit" couleur={c.blanc} numberOfLines={1}>
              {t('profil.modifier')}
            </Texte>
          </PressableAnime>
        </View>

        <CarteFavoris style={styles.chevauchement} />

        <GroupeReglages titre={t('profil.preferences')} style={styles.groupe} testID="groupe-preferences">
          <LigneMenu libelle={t('profil.communeDefaut')} valeur={zone?.nom ?? t('profil.aucune')} onPress={() => router.push('/zone')} />
          <LigneMenu libelle={t('profil.pays')} valeur={pays?.nom ?? ''} onPress={() => router.push('/zone/pays')} />
          <LigneMenu
            libelle={t('profil.mesAssurances')}
            valeur={resumeAssurances(mesAssurances.map((a) => a.nom))}
            onPress={() => router.push({ pathname: '/assurances', params: { contexte: 'profil' } })}
            testID="ligne-mes-assurances"
          />
          <LigneMenu libelle={t('profil.langue')} valeur={NOM_LANGUE[langue]()} onPress={choisirLangue} testID="ligne-langue" />
          <LigneMenu
            libelle={t('profil.modeNuit')}
            sousTitre={modeNuit === 'auto' ? t('profil.modeNuitAuto') : undefined}
            valeur={t(`profil.modes.${modeNuit}`)}
            onPress={() => definirModeNuit(CYCLE_MODE[modeNuit])}
            testID="ligne-mode-nuit"
          />
          {/* Refus de l'autorisation : le message est donné par useNotificationGarde (réglages du téléphone). */}
          <LigneMenu
            libelle={t('profil.notifTitre')}
            sousTitre={t('profil.notifTexte')}
            droite={
              <CaseACocher
                coche={notification.actif}
                onChange={notification.basculer}
                libelle={t('profil.notifTitre')}
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
      <EditionProfil
        visible={edition}
        profil={profil}
        onFermer={() => setEdition(false)}
        onEnregistrer={(p) => {
          definirProfil(p);
          setEdition(false);
        }}
      />
    </Ecran>
  );
}

/** « MUGEF-CI, CMU + 2 » : deux noms au plus, puis le nombre des autres. */
function resumeAssurances(noms: string[]): string {
  if (noms.length === 0) return t('profil.aucune');
  const debut = noms.slice(0, 2).join(', ');
  return noms.length > 2 ? `${debut} + ${noms.length - 2}` : debut;
}

const styles = StyleSheet.create({
  contenu: { paddingBottom: 24 },
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20 + CHEVAUCHEMENT,
    borderBottomLeftRadius: rayons.feuille,
    borderBottomRightRadius: rayons.feuille,
  },
  prolongement: { position: 'absolute', left: 0, right: 0, bottom: '100%', height: 600 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  identite: { flex: 1, minWidth: 0, gap: 2 },
  modifier: {
    minHeight: CIBLE_TACTILE,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: rayons.pilule,
  },
  chevauchement: { marginTop: -CHEVAUCHEMENT, marginHorizontal: 16 },
  groupe: { marginTop: 20, marginHorizontal: 16 },
  pied: { marginTop: 12, marginHorizontal: 20, gap: 4 },
  lienAgent: { minHeight: CIBLE_TACTILE, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
});

export default avecErrorBoundary(Profil, 'Profil');
