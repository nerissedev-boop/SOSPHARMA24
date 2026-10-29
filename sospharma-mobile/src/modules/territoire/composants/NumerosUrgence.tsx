import { Pressable, StyleSheet, View } from 'react-native';

import type { NumeroUrgence } from '@/commun/api';
import { appeler, t } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import { HiAccidentAndEmergency, HiAmbulance, HiEmergencyPost, Texte } from '@/commun/ui';

/** Icône d'un numéro d'urgence selon la configuration pays. */
export function IconeUrgence({ icone, taille }: { icone: NumeroUrgence['icone']; taille: number }) {
  const { couleurs: c } = useTheme();
  if (icone === 'ambulance') return <HiAmbulance size={taille} color={c.rougeTexteFort} />;
  if (icone === 'pompiers') return <HiAccidentAndEmergency size={taille} color={c.rougeTexteFort} />;
  return <HiEmergencyPost size={taille} color={c.rouge} />;
}

type Props = {
  urgences: NumeroUrgence[];
  /** grille : deux cases (zone non couverte) ; liste : lignes pleines (écran Urgence). */
  variante?: 'grille' | 'liste';
};

/** Numéros d'urgence lus dans la configuration du pays (jamais en dur). */
export function NumerosUrgence({ urgences, variante = 'liste' }: Props) {
  const { couleurs: c } = useTheme();
  if (variante === 'grille') {
    return (
      <View style={styles.grille}>
        {urgences.map((u) => (
          <Pressable
            key={u.code}
            testID={`urgence-${u.code}`}
            onPress={() => appeler(u.numero)}
            accessibilityRole="button"
            accessibilityLabel={t('urgence.appeler', { nom: u.libelle, numero: u.numero })}
            style={({ pressed }) => [styles.case, { backgroundColor: c.rougeClair, opacity: pressed ? 0.8 : 1 }]}
          >
            <IconeUrgence icone={u.icone} taille={30} />
            <View>
              <Texte variante="libelle" couleur={c.texteSecondaire}>
                {u.libelle_court}
              </Texte>
              <Texte variante="distanceGrande" couleur={c.rougeTexteFort} style={styles.numeroGrille}>
                {u.numero}
              </Texte>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.liste}>
      {urgences.map((u) => (
        <Pressable
          key={u.code}
          testID={`urgence-${u.code}`}
          onPress={() => appeler(u.numero)}
          accessibilityRole="button"
          accessibilityLabel={t('urgence.appeler', { nom: u.libelle, numero: u.numero })}
          style={({ pressed }) => [styles.ligne, { backgroundColor: c.rougeClair, opacity: pressed ? 0.8 : 1 }]}
        >
          <IconeUrgence icone={u.icone} taille={34} />
          <View style={styles.textes}>
            <Texte variante="nom">{u.libelle}</Texte>
            <Texte variante="libelle" couleur={c.texteSecondaire}>
              {u.description}
            </Texte>
          </View>
          <Texte variante="titre" couleur={c.rougeTexteFort} style={styles.numero}>
            {u.numero}
          </Texte>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: 'row', gap: 8 },
  case: { flex: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderRadius: rayons.moyen },
  numeroGrille: { fontSize: 20, lineHeight: 24 },
  liste: { gap: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 44, borderRadius: rayons.moyen },
  textes: { flex: 1, gap: 2 },
  numero: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22 },
});
