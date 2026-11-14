import { StyleSheet, View, type DimensionValue } from 'react-native';

import { hauteurs, rayons, useTheme } from '@/commun/theme';
import { Squelette, ZoneSquelette } from '@/commun/ui';

/** Largeurs des valeurs des lignes d'infos (irrégulières, comme du vrai texte). */
const LARGEURS_INFOS: DimensionValue[] = ['58%', '74%', '46%'];

type Props = {
  hauteurPhoto: number;
  /** De combien la grande carte remonte sur la photo (comme la fiche chargée). */
  chevauchement: number;
  testID?: string;
};

/**
 * Forme de la fiche pharmacie pendant le chargement : bande du haut, grande carte qui la chevauche
 * (état, nom, distance, assurance, deux boutons de 56), puis la carte d'infos. Le nom et les boutons
 * gardent leur place exacte : rien ne saute à l'arrivée des données. Une seule respiration pour tout.
 */
export function SqueletteFichePharmacie({ hauteurPhoto, chevauchement, testID }: Props) {
  const { couleurs: c } = useTheme();
  // Blocs posés sur une carte : `puceFond` reste visible sur la carte, de jour comme de nuit.
  const surCarte = { backgroundColor: c.puceFond };
  return (
    <ZoneSquelette testID={testID}>
      <View style={{ height: hauteurPhoto, backgroundColor: c.facadeCadre }} />
      <View style={[styles.corps, { marginTop: -chevauchement }]}>
        <View style={[styles.principale, { backgroundColor: c.carte }]}>
          <Squelette anime={false} largeur={150} hauteur={18} style={surCarte} />
          <Squelette anime={false} largeur="74%" hauteur={30} style={surCarte} />
          <Squelette anime={false} largeur="52%" hauteur={18} style={surCarte} />
          <Squelette anime={false} largeur={160} hauteur={26} rayon={rayons.repere} style={surCarte} />
          <View style={styles.boutons}>
            <Squelette anime={false} hauteur={hauteurs.boutonAction} rayon={rayons.touche} style={[styles.appeler, surCarte]} />
            <Squelette anime={false} hauteur={hauteurs.boutonAction} rayon={rayons.touche} style={[styles.yAller, surCarte]} />
          </View>
        </View>
        <View style={[styles.infos, { backgroundColor: c.carte }]}>
          {LARGEURS_INFOS.map((largeur, i) => (
            <View key={i} style={styles.ligneInfo}>
              <Squelette anime={false} largeur={20} hauteur={20} rayon={10} style={surCarte} />
              <View style={styles.textes}>
                <Squelette anime={false} largeur="30%" hauteur={12} style={surCarte} />
                <Squelette anime={false} largeur={largeur} hauteur={16} style={surCarte} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ZoneSquelette>
  );
}

const styles = StyleSheet.create({
  corps: { paddingHorizontal: 16, gap: 14 },
  principale: { borderRadius: rayons.surface, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  infos: { borderRadius: rayons.surface, paddingHorizontal: 16, paddingVertical: 4 },
  boutons: { flexDirection: 'row', gap: 8, marginTop: 6, marginHorizontal: -8 },
  appeler: { flex: 1.25, width: undefined },
  yAller: { flex: 1, width: undefined },
  ligneInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  textes: { flex: 1, gap: 8 },
});
