import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { alerte, estModeDemo, initiales, t, usePreferences, type ModeNuit } from '@/commun/lib';
import { libelleStatut } from '@/commun/regles';
import { useTheme } from '@/commun/theme';
import { avecErrorBoundary, CaseACocher, Ecran, IconeBulle, IconePlus, LigneMenu, LignePharmacie, Texte } from '@/commun/ui';
import { useNotificationGarde } from '@/modules/notifications';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { EditionProfil } from '../composants/EditionProfil';
import { useFavoris } from '../hooks/useFavoris';

const CYCLE_MODE: Record<ModeNuit, ModeNuit> = { auto: 'nuit', nuit: 'jour', jour: 'auto' };

/** 14 Profil et favoris. */
function Profil() {
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const [edition, setEdition] = useState(false);
  const profil = usePreferences((e) => e.profil);
  const definirProfil = usePreferences((e) => e.definirProfil);
  const modeNuit = usePreferences((e) => e.modeNuit);
  const definirModeNuit = usePreferences((e) => e.definirModeNuit);
  const { zone } = useZoneCourante();
  const { pays, fuseau } = usePaysCourant();
  const favoris = useFavoris();
  const notification = useNotificationGarde();
  const mesAssurances = usePreferences((e) => e.mesAssurances);
  const nomComplet = `${profil.prenom} ${profil.nom}`.trim();

  return (
    <Ecran testID="ecran-profil">
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.entete}>
          <Texte variante="titreEcran" titre>
            {t('profil.titre')}
          </Texte>
        </View>

        <View style={[styles.carteProfil, { backgroundColor: c.surface }]}>
          <View style={[styles.avatar, { backgroundColor: c.vert }]}>
            <Texte variante="nomGrand" couleur={c.blanc} style={styles.initiales}>
              {initiales(profil.prenom, profil.nom) || '?'}
            </Texte>
          </View>
          <View style={styles.flex}>
            <Texte variante="nomGrand">{nomComplet || t('profil.ajouterNom')}</Texte>
            <Texte variante="petit" couleur={c.texteSecondaire}>
              {profil.telephone || t('profil.localSeulement')}
            </Texte>
          </View>
          <Pressable onPress={() => setEdition(true)} accessibilityRole="button" style={styles.modifier} hitSlop={6}>
            <Texte variante="boutonPetit" couleur={c.vertTexte} style={styles.texte13}>
              {t('profil.modifier')}
            </Texte>
          </Pressable>
        </View>

        <View>
          <Texte variante="sectionMoyenne" titre style={styles.titreSection}>
            {t('profil.favoris')}
          </Texte>
          {(favoris.data ?? []).map((p) => (
            <LignePharmacie
              key={p.id}
              variante="favori"
              nom={p.nom}
              statut={p.statut}
              libelleStatut={libelleStatut(p, fuseau)}
              distanceM={p.distance_m}
              marcheMin={p.marche_min}
              onPress={() => router.push({ pathname: '/pharmacie/[id]', params: { id: p.id } })}
            />
          ))}
          {favoris.data && favoris.data.length === 0 ? (
            <Texte variante="petit" couleur={c.texteSecondaire} style={styles.vide}>
              {t('profil.aucunFavori')}
            </Texte>
          ) : null}
        </View>

        <View>
          <Texte variante="sectionMoyenne" titre style={styles.titreSection}>
            {t('profil.preferences')}
          </Texte>
          <LigneMenu
            libelle={t('profil.mesAssurances')}
            valeur={mesAssurances.length ? mesAssurances.map((a) => a.nom).join(', ') : t('profil.aucune')}
            onPress={() => router.push({ pathname: '/assurances', params: { contexte: 'profil' } })}
            testID="ligne-mes-assurances"
          />
          <LigneMenu libelle={t('profil.communeDefaut')} valeur={zone?.nom ?? t('profil.aucune')} onPress={() => router.push('/zone')} />
          <LigneMenu libelle={t('profil.pays')} valeur={pays?.nom ?? ''} onPress={() => router.push('/zone/pays')} />
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
          <LigneMenu
            libelle={t('profil.modeNuit')}
            valeur={t(`profil.modes.${modeNuit}`)}
            onPress={() => definirModeNuit(CYCLE_MODE[modeNuit])}
            testID="ligne-mode-nuit"
          />
          <LigneMenu
            libelle={t('profil.langue')}
            valeur={t('profil.francais')}
            onPress={() => alerte(t('profil.langue'), t('profil.langueSeule'))}
          />
        </View>

        <View>
          <Texte variante="sectionMoyenne" titre style={styles.titreSection}>
            {t('profil.aide')}
          </Texte>
          <Pressable onPress={() => router.push('/contact')} accessibilityRole="button" style={styles.lienAide}>
            <IconeBulle size={20} color={c.vertTexte} />
            <Texte variante="corpsFort" couleur={c.vertTexte} style={styles.gras}>
              {t('profil.contact')}
            </Texte>
          </Pressable>
          <Pressable onPress={() => router.push('/proposer')} accessibilityRole="button" style={styles.lienAide} testID="lien-proposer">
            <IconePlus size={20} color={c.vert} strokeWidth={2.2} />
            <Texte variante="corps">{t('profil.proposer')}</Texte>
          </Pressable>
          <Pressable
            onPress={() => router.push('/agent/connexion')}
            accessibilityRole="link"
            style={styles.lienSignaler}
            testID="lien-espace-agent"
          >
            <Texte variante="petit" couleur={c.texteSecondaire}>
              {t('profil.espaceAgent')}
            </Texte>
          </Pressable>
          {estModeDemo() ? (
            <Texte variante="libelle" couleur={c.texteTertiaire} style={styles.demo}>
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

const styles = StyleSheet.create({
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  entete: { height: 44, justifyContent: 'center' },
  carteProfil: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  initiales: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17 },
  flex: { flex: 1, gap: 2 },
  modifier: { height: 44, justifyContent: 'center' },
  texte13: { fontSize: 13 },
  titreSection: { marginBottom: 4 },
  vide: { paddingVertical: 8 },
  lienAide: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  gras: { fontFamily: 'PlusJakartaSans_700Bold' },
  lienSignaler: { minHeight: 44, justifyContent: 'center' },
  demo: { marginTop: 8 },
});

export default avecErrorBoundary(Profil, 'Profil');
