import { StyleSheet, View } from 'react-native';

import type { StatutPharmacie } from '../../api/schema';
import { ombres } from '../../theme/ombres';
import { rayons } from '../../theme/rayons';
import { useTheme } from '../../theme/Theme';
import { PastilleStatut } from '../PastilleStatut';
import { Texte } from '../Texte';

type PropsMarqueur = {
  statut: StatutPharmacie;
  /** « 0,4 km » si sélectionné, « 0,7 » sinon (comme sur la maquette Carte). */
  etiquette: string;
  selectionne?: boolean;
};

/** Marqueur pharmacie : coupe d'Hygie dans sa pastille + étiquette de distance accolée. */
export function MarqueurPharmacie({ statut, etiquette, selectionne = false }: PropsMarqueur) {
  const { couleurs: c, estNuit } = useTheme();
  const taille = selectionne ? 52 : statut === 'fermee' ? 38 : statut === 'garde' ? 42 : 40;
  const fondEtiquette = selectionne ? c.etiquetteSelection : c.etiquetteCarte;
  const texteEtiquette = selectionne ? c.etiquetteSelectionTexte : statut === 'fermee' ? c.texteTertiaire : c.etiquetteCarteTexte;
  return (
    <View style={styles.marqueur} pointerEvents="box-none">
      <View style={[selectionne ? ombres.marqueurSelection : ombres.marqueur, { borderRadius: taille / 2 }]}>
        <PastilleStatut
          statut={statut}
          taille={taille}
          tailleIcone={selectionne ? 32 : statut === 'fermee' ? 22 : taille === 40 ? 24 : 26}
          badge24={statut === 'garde' && (selectionne || !estNuit)}
          fondFerme={estNuit ? c.surface2 : c.blanc}
        />
      </View>
      <View
        style={[
          styles.etiquette,
          selectionne ? styles.etiquetteSelection : null,
          { backgroundColor: fondEtiquette, marginLeft: selectionne ? -8 : -6 },
        ]}
      >
        <Texte variante={selectionne ? 'petitFort' : 'libelleFort'} couleur={texteEtiquette} style={selectionne ? styles.texteSelection : undefined}>
          {etiquette}
        </Texte>
      </View>
    </View>
  );
}

/** Regroupement par commune (carte dézoomée) : cercle vert + nombre de gardes en rouge. */
export function MarqueurCommune({ nombre, gardes }: { nombre: number; gardes: number }) {
  const { couleurs: c } = useTheme();
  const taille = nombre >= 40 ? 64 : nombre >= 20 ? 54 : 44;
  return (
    <View
      style={[
        styles.commune,
        ombres.marqueur,
        { width: taille + 16, height: taille + 16, borderRadius: (taille + 16) / 2, backgroundColor: 'rgba(27,138,62,0.18)' },
      ]}
    >
      <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: c.vert, alignItems: 'center', justifyContent: 'center' }}>
        <Texte variante="distanceGrande" couleur={c.blanc} style={{ fontSize: taille >= 54 ? 18 : 15 }}>
          {nombre}
        </Texte>
      </View>
      <View style={[styles.badgeCommune, { backgroundColor: c.rouge, top: 2, right: 0 }]}>
        <Texte variante="miniFort" couleur={c.blanc}>
          {gardes}
        </Texte>
      </View>
    </View>
  );
}

/** Point bleu « vous êtes ici » (rond : exception de la charte). */
export function PointPosition({ taille = 26 }: { taille?: number }) {
  const { couleurs: c } = useTheme();
  const halo = taille + 32;
  return (
    <View style={{ width: halo, height: halo, borderRadius: halo / 2, backgroundColor: c.bleuPositionHalo, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: taille,
          height: taille,
          borderRadius: taille / 2,
          backgroundColor: c.bleuPositionContour,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: taille - 10, height: taille - 10, borderRadius: (taille - 10) / 2, backgroundColor: c.bleuPosition }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  marqueur: { flexDirection: 'row', alignItems: 'center' },
  etiquette: { paddingLeft: 9, paddingRight: 7, paddingVertical: 2, borderRadius: rayons.pilule, zIndex: -1 },
  etiquetteSelection: { paddingLeft: 12, paddingRight: 9, paddingVertical: 4 },
  texteSelection: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
  commune: { alignItems: 'center', justifyContent: 'center' },
  badgeCommune: {
    position: 'absolute',
    minWidth: 22,
    height: 22,
    borderRadius: rayons.pilule,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
