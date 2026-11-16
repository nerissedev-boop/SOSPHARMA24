import { useRouter } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { appeler, commencerVisite, t } from '@/commun/lib';
import { libelleStatut, tonAffiche } from '@/commun/regles';
import { CIBLE_TACTILE, rayons, useMaintenant, useTheme } from '@/commun/theme';
import { Squelette, Texte, ZoneSquelette } from '@/commun/ui';
import { usePaysCourant } from '@/modules/territoire';

import { useFavoris } from '../hooks/useFavoris';
import { LigneFavori } from './LigneFavori';

/**
 * « Mes pharmacies » (refonte v2) : un groupe à plat, un filet entre deux pharmacies, le bouton
 * d'appel sur chaque ligne. États : chargement (lignes squelettes fidèles), liste, aucun favori,
 * erreur avec « Réessayer ».
 */
export function CarteFavoris({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const { pays, fuseau } = usePaysCourant();
  // Recalculé chaque minute : « Ferme dans 20 min » ne reste pas figé.
  const maintenant = useMaintenant();
  const favoris = useFavoris();
  const liste = favoris.data;
  // Blocs gris posés sur le groupe : `puceFond` reste visible sur la carte, de jour comme de nuit.
  const neutre = c.puceFond;
  const appelerFavori = (id: string, nom: string, telephone: string) => () => {
    commencerVisite({ id, nom });
    void appeler(telephone, pays?.indicatif);
  };

  let contenu: ReactNode;
  if (liste && liste.length > 0) {
    contenu = liste.map((p, rang) => (
      <Fragment key={p.id}>
        {rang > 0 ? <View style={[styles.filet, { backgroundColor: c.separateur }]} /> : null}
        <LigneFavori
          testID={`favori-${p.id}`}
          nom={p.nom}
          statut={p.statut}
          libelleStatut={libelleStatut(p, fuseau, 'liste', maintenant)}
          ton={tonAffiche(p, fuseau, maintenant)}
          distanceM={p.distance_m}
          photoUrl={p.photo_url}
          positionAConfirmer={p.latitude === null}
          onPress={() => router.push({ pathname: '/pharmacie/[id]', params: { id: p.id } })}
          onAppeler={p.telephone ? appelerFavori(p.id, p.nom, p.telephone) : undefined}
        />
      </Fragment>
    ));
  } else if (liste) {
    contenu = (
      <Texte variante="petit" couleur={c.texteSecondaire} style={styles.vide} testID="favoris-vide">
        {t('profil.aucunFavori')}
      </Texte>
    );
  } else if (favoris.isError) {
    contenu = (
      <View style={styles.erreur} testID="favoris-erreur">
        <Texte variante="petit" couleur={c.texteSecondaire}>
          {t('profil.favorisErreur')}
        </Texte>
        <Pressable
          onPress={() => void favoris.refetch()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.reessayer, { opacity: pressed ? 0.7 : 1 }]}
          testID="favoris-reessayer"
        >
          <Texte variante="boutonPetit" couleur={c.vertTexte}>
            {t('commun.reessayer')}
          </Texte>
        </Pressable>
      </View>
    );
  } else {
    // Même gabarit que les lignes (nom, état, bouton d'appel) : rien ne saute à l'arrivée des données.
    contenu = (
      <ZoneSquelette testID="favoris-chargement">
        {[0, 1].map((rang) => (
          <View key={rang} style={styles.ligneSquelette}>
            <View style={styles.textesSquelette}>
              <Squelette anime={false} largeur="62%" hauteur={14} style={{ backgroundColor: neutre }} />
              <Squelette anime={false} largeur="38%" hauteur={12} style={{ backgroundColor: neutre }} />
            </View>
            <Squelette anime={false} largeur={CIBLE_TACTILE} hauteur={CIBLE_TACTILE} rayon={CIBLE_TACTILE / 2} style={{ backgroundColor: neutre }} />
          </View>
        ))}
      </ZoneSquelette>
    );
  }

  return (
    <View style={[styles.carte, { backgroundColor: c.carte }, style]} testID="carte-favoris">
      {contenu}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { paddingHorizontal: 16, borderRadius: rayons.surface },
  filet: { height: 1 },
  vide: { paddingVertical: 16 },
  ligneSquelette: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  textesSquelette: { flex: 1, gap: 8 },
  erreur: { paddingTop: 12, paddingBottom: 4, gap: 2 },
  reessayer: { minHeight: CIBLE_TACTILE, justifyContent: 'center', alignSelf: 'flex-start' },
});
