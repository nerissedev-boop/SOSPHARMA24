import { Pressable, StyleSheet, View } from 'react-native';

import type { StatutPharmacie } from '../api/schema';
import { distanceKm } from '../lib/format';
import { t } from '../lib/i18n';
import { ombres } from '../theme/ombres';
import { useTheme } from '../theme/Theme';
import { Bouton } from './Bouton';
import { DistanceMarche } from './DistanceMarche';
import { HiPhone } from './icones/healthicons';
import { IconeItineraire } from './icones/trait';
import { PastilleStatut } from './PastilleStatut';
import { Texte } from './Texte';

type Props = {
  titre: string;
  nom: string;
  statut: StatutPharmacie;
  libelleStatut: string;
  distanceM: number | null;
  marcheMin: number | null;
  /** Variante garde : fond rouge clair, titre rouge, pastille rouge avec badge 24. */
  garde?: boolean;
  onPress?: () => void;
  onAppeler?: () => void;
  onItineraire?: () => void;
  testID?: string;
};

/** Bloc « La plus proche ouverte » (vert clair) ou « La plus proche de garde » (rouge clair). */
export function BlocPlusProche({
  titre,
  nom,
  statut,
  libelleStatut,
  distanceM,
  marcheMin,
  garde = false,
  onPress,
  onAppeler,
  onItineraire,
  testID,
}: Props) {
  const { couleurs: c, estNuit } = useTheme();
  // Palette enrichie : carte blanche sur fond sable, détachée par une ombre très légère (pas de bordure).
  const ombre = estNuit ? null : ombres.enTete;
  const couleurStatut = statut === 'garde' ? c.rougeTexteFort : statut === 'ouverte' ? c.vertTexte : c.texteTertiaire;
  return (
    <View testID={testID} style={[styles.bloc, { backgroundColor: garde ? c.blocProcheGarde : c.blocProche }, ombre]}>
      <Texte variante="libelleFort" couleur={garde ? c.blocProcheGardeTitre : c.blocProcheTitre}>
        {titre}
      </Texte>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${titre} : ${nom}, ${libelleStatut}, ${distanceKm(distanceM)}`}
        style={({ pressed }) => [styles.ligne, { opacity: pressed ? 0.75 : 1 }]}
      >
        <PastilleStatut statut={statut} taille={46} tailleIcone={30} badge24={statut === 'garde'} />
        <View style={styles.textes}>
          <Texte variante="nomGrand" numberOfLines={1}>
            {nom}
          </Texte>
          <Texte variante="petitFort" couleur={couleurStatut} numberOfLines={1}>
            {libelleStatut}
          </Texte>
        </View>
        <DistanceMarche distanceM={distanceM} marcheMin={marcheMin} grande />
      </Pressable>
      <View style={styles.actions}>
        <Bouton
          libelle={t('commun.appeler')}
          accessibilityLabel={`${t('commun.appeler')} ${nom}`}
          onPress={onAppeler}
          hauteur={estNuit ? 46 : 44}
          typo="boutonPetit"
          icone={<HiPhone size={18} color={c.blanc} />}
          style={styles.action}
          testID={testID ? `${testID}-appeler` : undefined}
        />
        <Bouton
          libelle={t('commun.itineraire')}
          variante="blanc"
          onPress={onItineraire}
          hauteur={estNuit ? 46 : 44}
          icone={<IconeItineraire size={16} color={c.pastilleActionIcone} />}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { padding: 14, gap: 12, borderRadius: 0 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textes: { flex: 1, gap: 3, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
