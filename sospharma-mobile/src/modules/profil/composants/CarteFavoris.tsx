import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { t } from '@/commun/lib';
import { libelleStatut, tonAffiche } from '@/commun/regles';
import { CIBLE_TACTILE, ombres, rayons, useMaintenant, useTheme } from '@/commun/theme';
import { IconeCoeur, Squelette, Texte, ZoneSquelette } from '@/commun/ui';
import { usePaysCourant } from '@/modules/territoire';

import { useFavoris } from '../hooks/useFavoris';
import { LigneFavori } from './LigneFavori';

/**
 * Carte « Pharmacies favorites » (piste A, 11 nov.) : elle chevauche le bas du bandeau vert du Profil.
 * États : chargement (lignes squelettes fidèles), liste, aucun favori, erreur avec « Réessayer ».
 */
export function CarteFavoris({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const { couleurs: c, estNuit } = useTheme();
  const { fuseau } = usePaysCourant();
  // Recalculé chaque minute : « Ferme dans 20 min » ne reste pas figé.
  const maintenant = useMaintenant();
  const favoris = useFavoris();
  const liste = favoris.data;
  // Blocs gris et tuile neutre : `surface` se confond avec la carte la nuit, `surface2` reste visible.
  const neutre = estNuit ? c.surface2 : c.surface;

  let contenu: ReactNode;
  if (liste && liste.length > 0) {
    contenu = liste.map((p) => (
      <LigneFavori
        key={p.id}
        testID={`favori-${p.id}`}
        nom={p.nom}
        statut={p.statut}
        libelleStatut={libelleStatut(p, fuseau, 'liste', maintenant)}
        ton={tonAffiche(p, fuseau, maintenant)}
        distanceM={p.distance_m}
        photoUrl={p.photo_url ?? null}
        positionAConfirmer={p.latitude === null}
        onPress={() => router.push({ pathname: '/pharmacie/[id]', params: { id: p.id } })}
      />
    ));
  } else if (liste) {
    contenu = (
      <View style={styles.ligneInfo} testID="favoris-vide">
        <View style={[styles.tuile, { backgroundColor: neutre }]}>
          <IconeCoeur size={20} color={c.texteSecondaire} />
        </View>
        <Texte variante="petit" couleur={c.texteSecondaire} style={styles.flex}>
          {t('profil.aucunFavori')}
        </Texte>
      </View>
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
    // Même gabarit que les lignes (vignette 48, nom, statut) : rien ne saute à l'arrivée des données.
    contenu = (
      <ZoneSquelette testID="favoris-chargement" style={styles.liste}>
        {[0, 1].map((rang) => (
          <View key={rang} style={styles.ligneInfo}>
            <Squelette anime={false} largeur={48} hauteur={48} rayon={rayons.vignette} style={{ backgroundColor: neutre }} />
            <View style={styles.textesSquelette}>
              <Squelette anime={false} largeur="62%" hauteur={14} style={{ backgroundColor: neutre }} />
              <Squelette anime={false} largeur="38%" hauteur={12} style={{ backgroundColor: neutre }} />
            </View>
          </View>
        ))}
      </ZoneSquelette>
    );
  }

  return (
    <View style={[styles.carte, { backgroundColor: c.carte }, !estNuit && ombres.carte, style]} testID="carte-favoris">
      <Texte variante="sectionMoyenne" titre>
        {t('profil.favoris')}
      </Texte>
      <View style={styles.liste}>{contenu}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { paddingTop: 14, paddingBottom: 10, paddingHorizontal: 16, gap: 8, borderRadius: rayons.grandeCarte },
  liste: { gap: 4 },
  ligneInfo: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tuile: { width: 48, height: 48, borderRadius: rayons.vignette, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  textesSquelette: { flex: 1, gap: 8 },
  erreur: { paddingTop: 4, gap: 2 },
  reessayer: { minHeight: CIBLE_TACTILE, justifyContent: 'center', alignSelf: 'flex-start' },
});
