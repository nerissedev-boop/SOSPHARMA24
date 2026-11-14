import { StyleSheet, View, type DimensionValue } from 'react-native';

import { rayons, useTheme } from '@/commun/theme';
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
 * Forme de la fiche pharmacie (piste A) pendant le chargement : photo en tête, grande carte qui
 * chevauche son bas (puces de statut, nom, distance, trois boutons), puis la carte d'infos.
 * Une seule respiration pour tout (`ZoneSquelette`), annoncée « Chargement ».
 */
export function SqueletteFichePharmacie({ hauteurPhoto, chevauchement, testID }: Props) {
  const { couleurs: c } = useTheme();
  // Blocs posés sur une carte : `puceFond` reste visible sur la carte, de jour comme de nuit.
  const surCarte = { backgroundColor: c.puceFond };
  return (
    <ZoneSquelette testID={testID}>
      <Squelette anime={false} hauteur={hauteurPhoto} rayon={0} />
      <View style={[styles.corps, { marginTop: -chevauchement }]}>
        <View style={[styles.principale, { backgroundColor: c.carte }]}>
          <View style={styles.ligne}>
            <Squelette anime={false} largeur={136} hauteur={26} rayon={rayons.pilule} style={surCarte} />
            <Squelette anime={false} largeur={96} hauteur={26} rayon={rayons.pilule} style={surCarte} />
          </View>
          <Squelette anime={false} largeur="74%" hauteur={24} style={surCarte} />
          <Squelette anime={false} largeur="52%" hauteur={14} style={surCarte} />
          <View style={[styles.ligne, styles.boutons]}>
            <Squelette anime={false} hauteur={52} rayon={rayons.moyen} style={[styles.bouton, surCarte]} />
            <Squelette anime={false} hauteur={52} rayon={rayons.moyen} style={[styles.bouton, surCarte]} />
            <Squelette anime={false} largeur={52} hauteur={52} rayon={rayons.moyen} style={surCarte} />
          </View>
        </View>
        <View style={[styles.infos, { backgroundColor: c.carte }]}>
          {LARGEURS_INFOS.map((largeur, i) => (
            <View key={i} style={styles.ligneInfo}>
              <Squelette anime={false} largeur={20} hauteur={20} rayon={10} style={surCarte} />
              <View style={styles.textes}>
                <Squelette anime={false} largeur="30%" hauteur={10} style={surCarte} />
                <Squelette anime={false} largeur={largeur} hauteur={14} style={surCarte} />
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
  principale: { borderRadius: rayons.feuille, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  infos: { borderRadius: rayons.grandeCarte, paddingHorizontal: 16, paddingVertical: 4 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boutons: { gap: 10, marginTop: 6 },
  bouton: { flex: 1, width: undefined },
  ligneInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  textes: { flex: 1, gap: 6 },
});
