import { StyleSheet, View } from 'react-native';

import { t } from '@/commun/lib';
import { CIBLE_TACTILE, espacements, rayons, useTheme } from '@/commun/theme';
import { BarreZone, IconePartage, NombreAnime, PressableAnime, Texte } from '@/commun/ui';

/** La carte « La plus proche de garde » remonte de 48 sur le bas du bandeau (maquette, piste A). */
export const CHEVAUCHEMENT = 48;

type Props = {
  libelleZone: string;
  onChangerZone: () => void;
  onPartager: () => void;
  /** Rien à partager tant que le tour n'est pas là (premier chargement, erreur). */
  partageActif: boolean;
  /** Nombre de pharmacies de garde du tour ; null tant que le tour n'est pas là. */
  nombre: number | null;
  bornes: { debut: string; fin: string } | null;
  /** Premier chargement : la place du résumé est gardée, la carte ne saute pas à l'arrivée du tour. */
  reserverResume: boolean;
  /** Une carte chevauche le bas du bandeau : on lui laisse la place. */
  chevauche: boolean;
};

/**
 * Bandeau de l'écran Garde (piste A) : rouge foncé d'un bord à l'autre, coins bas arrondis, dans
 * le défilement. Zone en pilule et Partager en haut, puis le titre et le résumé du tour (nombre
 * de gardes, période).
 */
export function BandeauGarde({ libelleZone, onChangerZone, onPartager, partageActif, nombre, bornes, reserverResume, chevauche }: Props) {
  const { couleurs: c } = useTheme();
  return (
    <View
      testID="bandeau-garde"
      style={[styles.bandeau, { backgroundColor: c.bandeauGarde, paddingBottom: chevauche ? CHEVAUCHEMENT + 18 : 24 }]}
    >
      <View style={styles.rangee}>
        <BarreZone variante="pastille" surFonce libelle={libelleZone} onChanger={onChangerZone} testID="pastille-zone-garde" />
        <PressableAnime
          testID="bouton-partager-gardes"
          onPress={onPartager}
          disabled={!partageActif}
          accessibilityRole="button"
          accessibilityLabel={t('garde.partagerA11y')}
          accessibilityState={{ disabled: !partageActif }}
          style={[styles.partager, { backgroundColor: c.bandeauGardeBouton }, !partageActif && styles.inactif]}
        >
          <IconePartage size={20} color={c.texteSurCouleur} strokeWidth={2.2} />
        </PressableAnime>
      </View>
      <Texte variante="titreEcran" titre couleur={c.texteSurCouleur} style={styles.titre}>
        {t('garde.titre')}
      </Texte>
      {nombre !== null ? (
        <View style={styles.resume}>
          <NombreAnime variante="corpsFort" couleur={c.texteSurCouleur} valeur={nombre} rendu={(n) => t('garde.ouvertesNuit', { count: n })} />
          {bornes ? (
            <Texte variante="petit" couleur={c.rougeTendre}>
              {t('garde.tour', bornes)}
            </Texte>
          ) : null}
        </View>
      ) : reserverResume ? (
        // Deux lignes vides à la hauteur exacte du résumé, grandes polices comprises.
        <View style={styles.resume} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Texte variante="corpsFort"> </Texte>
          <Texte variante="petit"> </Texte>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bandeau: {
    paddingHorizontal: espacements.gouttiere,
    paddingTop: 12,
    borderBottomLeftRadius: rayons.feuille,
    borderBottomRightRadius: rayons.feuille,
  },
  rangee: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  partager: {
    width: CIBLE_TACTILE,
    height: CIBLE_TACTILE,
    borderRadius: CIBLE_TACTILE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inactif: { opacity: 0.5 },
  titre: { marginTop: 14 },
  resume: { marginTop: 4, gap: 2 },
});
