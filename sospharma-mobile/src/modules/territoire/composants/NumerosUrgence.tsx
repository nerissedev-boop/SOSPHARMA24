import { Pressable, StyleSheet, View } from 'react-native';

import type { NumeroUrgence } from '@/commun/api';
import { appeler, t } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import { HiAmbulance, HiOfficer, HiPhone, IconeFlamme, Texte } from '@/commun/ui';

/**
 * Icône d'un numéro d'urgence selon la configuration pays : une icône juste par service, sans carré.
 * Ambulance (SAMU), flamme (pompiers), agent (police) ; un autre numéro garde le téléphone, jamais
 * un signe médical qu'il ne mérite pas.
 */
export function IconeUrgence({ icone, taille }: { icone: NumeroUrgence['icone']; taille: number }) {
  const { couleurs: c } = useTheme();
  if (icone === 'ambulance') return <HiAmbulance size={taille} color={c.rougeTexteFort} />;
  if (icone === 'pompiers') return <IconeFlamme size={taille} color={c.rougeTexteFort} />;
  if (icone === 'police') return <HiOfficer size={taille} color={c.rougeTexteFort} />;
  return <HiPhone size={taille} color={c.rougeTexteFort} />;
}

type Props = {
  urgences: NumeroUrgence[];
  /** grille : deux cases (zone non couverte) ; liste : un seul bloc, un filet entre deux numéros. */
  variante?: 'grille' | 'liste';
  /** Lignes hautes et numéros plus grands (écran Urgence). */
  grand?: boolean;
};

/** Numéros d'urgence lus dans la configuration du pays (jamais en dur). Un appui compose le numéro. */
export function NumerosUrgence({ urgences, variante = 'liste', grand = false }: Props) {
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
    <View style={[styles.bloc, { backgroundColor: c.rougeClair }]} testID="numeros-urgence">
      {urgences.map((u, i) => (
        <Pressable
          key={u.code}
          testID={`urgence-${u.code}`}
          // appeler() vibre déjà (action franche) : pas de second retour haptique ici.
          onPress={() => void appeler(u.numero)}
          accessibilityRole="button"
          accessibilityLabel={t('urgence.appeler', { nom: u.libelle, numero: u.numero })}
          accessibilityHint={u.description || undefined}
          style={({ pressed }) => [styles.ligne, grand && styles.ligneGrande, { opacity: pressed ? 0.7 : 1 }]}
        >
          {i > 0 ? <View style={[styles.filet, { backgroundColor: c.separateur }]} /> : null}
          <IconeUrgence icone={u.icone} taille={30} />
          <View style={styles.textes}>
            <Texte variante="nomGrand">{u.libelle_court || u.libelle}</Texte>
            {u.description ? (
              <Texte variante="petit" couleur={c.texteSecondaire}>
                {u.description}
              </Texte>
            ) : null}
          </View>
          <Texte variante={grand ? 'titreEcran' : 'titre'} titre couleur={c.rougeTexteFort} style={[styles.numero, grand && styles.numeroGrand]}>
            {u.numero}
          </Texte>
          <HiPhone size={20} color={c.rougeTexteFort} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: 'row', gap: 8 },
  case: { flex: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderRadius: rayons.touche },
  numeroGrille: { fontSize: 20, lineHeight: 24 },
  bloc: { paddingHorizontal: 16, borderRadius: rayons.surface },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 10 },
  ligneGrande: { minHeight: 84 },
  filet: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  textes: { flex: 1, minWidth: 0, gap: 1 },
  numero: { fontVariant: ['tabular-nums'] },
  numeroGrand: { fontSize: 34, lineHeight: 38 },
});
