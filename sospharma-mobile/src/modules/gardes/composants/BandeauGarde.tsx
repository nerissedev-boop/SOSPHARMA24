import { StyleSheet, View } from 'react-native';

import { t } from '@/commun/lib';
import { CIBLE_TACTILE, espacements, rayons, useTheme } from '@/commun/theme';
import { BandeauHorsConnexion, BarreZone, IconePartage, NombreAnime, PressableAnime, Texte } from '@/commun/ui';

/** La carte « La plus proche » remonte de 52 sur le bas du bandeau (refonte v2). */
export const CHEVAUCHEMENT = 52;

type Props = {
  libelleZone: string;
  onChangerZone: () => void;
  onPartager: () => void;
  /** Rien à partager tant que le tour n'est pas là (premier chargement, erreur). */
  partageActif: boolean;
  /** Nombre de pharmacies de garde du tour ; null tant que le tour n'est pas là. */
  nombre: number | null;
  bornes: { debut: string; fin: string } | null;
  /** « 6 nov. » : date de confirmation de la liste par l'Ordre, à côté de la période du tour. */
  confirmeeLe: string | null;
  /** Hors connexion : heure de la dernière mise à jour du tour (`dataUpdatedAt`). */
  misAJourLe: number;
  /** Sans aucune liste enregistrée, l'état « hors connexion » de la liste le dit déjà. */
  masquerHorsConnexion: boolean;
  fuseau: string;
  /** Premier chargement : la place du résumé est gardée, la carte ne saute pas à l'arrivée du tour. */
  reserverResume: boolean;
  /** Une carte chevauche le bas du bandeau : on lui laisse la place. */
  chevauche: boolean;
};

/**
 * Bandeau de l'écran Garde : rouge foncé d'un bord à l'autre, coins bas arrondis, dans le
 * défilement. Zone et Partager en haut, puis le titre, le nombre de gardes et, comme sur la liste
 * de l'Ordre, la période du tour et la date de confirmation, en tête plutôt qu'en pied de liste.
 */
export function BandeauGarde({
  libelleZone,
  onChangerZone,
  onPartager,
  partageActif,
  nombre,
  bornes,
  confirmeeLe,
  misAJourLe,
  masquerHorsConnexion,
  fuseau,
  reserverResume,
  chevauche,
}: Props) {
  const { couleurs: c } = useTheme();
  const periode = [bornes ? t('garde.tourCourt', bornes) : null, confirmeeLe ? t('garde.confirmeeBandeau', { date: confirmeeLe }) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <View testID="bandeau-garde" style={[styles.bandeau, { backgroundColor: c.bandeauGarde, paddingBottom: chevauche ? CHEVAUCHEMENT + 20 : 24 }]}>
      <View style={styles.rangee}>
        <BarreZone variante="pastille" surFonce libelle={libelleZone} onChanger={onChangerZone} testID="pastille-zone-garde" />
        <PressableAnime
          testID="bouton-partager-gardes"
          onPress={onPartager}
          disabled={!partageActif}
          accessibilityRole="button"
          accessibilityLabel={t('garde.partagerA11y')}
          accessibilityState={{ disabled: !partageActif }}
          style={[styles.partager, { backgroundColor: c.boutonSurFonce }, !partageActif && styles.inactif]}
        >
          <IconePartage size={20} color={c.texteSurCouleur} strokeWidth={2.2} />
        </PressableAnime>
      </View>
      <BandeauHorsConnexion misAJourLe={misAJourLe} fuseau={fuseau} couleurTexte={c.rougeTendre} visible={masquerHorsConnexion ? false : undefined} />
      <Texte variante="titreEcran" titre couleur={c.texteSurCouleur}>
        {t('garde.titre')}
      </Texte>
      {nombre !== null ? (
        <View style={styles.resume}>
          <NombreAnime variante="corpsFort" couleur={c.texteSurCouleur} valeur={nombre} rendu={(n) => t('garde.ouvertesNuit', { count: n })} />
          {periode ? (
            <Texte variante="petit" couleur={c.rougeTendre} testID="garde-periode">
              {periode}
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
    gap: 6,
    borderBottomLeftRadius: rayons.surface,
    borderBottomRightRadius: rayons.surface,
  },
  rangee: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  partager: {
    width: CIBLE_TACTILE,
    height: CIBLE_TACTILE,
    borderRadius: CIBLE_TACTILE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inactif: { opacity: 0.5 },
  resume: { gap: 2 },
});
