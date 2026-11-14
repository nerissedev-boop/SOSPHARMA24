import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PlageHoraire } from '@/commun/api';
import { t } from '@/commun/lib';
import { CIBLE_TACTILE, useTheme } from '@/commun/theme';
import { DUREES, IconeChevronBas, IconeHorloge, Texte } from '@/commun/ui';

/** Lundi en tête, comme un calendrier. */
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];
/** Retrait de la semaine dépliée : alignée sur le texte (icône 20 + écart 12). */
const RETRAIT_SEMAINE = 32;

const COURBE = Easing.out(Easing.cubic);
/** La semaine arrive pendant que la carte s'agrandit (même durée), et repart plus vite. */
const ENTREE_SEMAINE = FadeIn.duration(DUREES.glissement).reduceMotion(ReduceMotion.System);
const SORTIE_SEMAINE = FadeOut.duration(DUREES.disparition).reduceMotion(ReduceMotion.System);

const plagesDu = (horaires: PlageHoraire[], jour: number) => horaires.filter((h) => h.jour === jour);

/** « 08:00 – 21:00, 14:00 – 19:00 » à l'écran. */
const plagesAffichees = (plages: PlageHoraire[]) => plages.map((p) => `${p.ouverture} – ${p.fermeture}`).join(', ');

/** « 08:00 à 21:00 et 14:00 à 19:00 » pour le lecteur d'écran (le tiret n'est pas lu partout). */
const plagesLues = (plages: PlageHoraire[]) =>
  plages.map((p) => t('horaires.plage', { debut: p.ouverture, fin: p.fermeture })).join(t('horaires.separateur'));

const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);

type Props = {
  horaires: PlageHoraire[];
  h24: boolean;
  /** Jour de la semaine dans le fuseau du pays (0 = dimanche). */
  aujourdhui: number;
};

/**
 * Ligne « Horaires » de la fiche (piste A) : les horaires du jour, et un chevron qui déplie les
 * 7 jours (aujourd'hui en gras) pour savoir si la pharmacie ouvre demain ou dimanche.
 * 24h/24 ou horaires pas encore relevés : une seule ligne, rien à déplier.
 * Mouvement : le chevron pivote, la semaine apparaît en fondu ; les lignes voisines glissent
 * (transition de mise en page posée par la fiche). « Supprimer les animations » : tout est immédiat.
 */
export function HorairesFiche({ horaires, h24, aujourdhui }: Props) {
  const { couleurs: c } = useTheme();
  const [deplie, setDeplie] = useState(false);
  const rotation = useSharedValue(0);
  const styleChevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${180 * rotation.get()}deg` }] }));

  // Fiche importée, pas encore relevée : on ne montre pas sept jours « Fermée ».
  const aConfirmer = !h24 && horaires.length === 0;
  const depliable = !h24 && !aConfirmer;
  const duJour = plagesDu(horaires, aujourdhui);
  const valeur = h24
    ? t('fiche.h24')
    : aConfirmer
      ? t('statut.appelerAvant')
      : duJour.length
        ? t('fiche.aujourdhui', { plages: plagesAffichees(duJour) })
        : t('fiche.fermeAujourdhui');
  const valeurLue = depliable && duJour.length ? t('fiche.aujourdhui', { plages: plagesLues(duJour) }) : valeur;
  const libelle = `${t('fiche.horaires')}, ${valeurLue}`;

  const basculer = () => {
    const suivant = !deplie;
    setDeplie(suivant);
    rotation.set(
      withTiming(suivant ? 1 : 0, {
        duration: suivant ? DUREES.glissement : DUREES.disparition,
        easing: COURBE,
        reduceMotion: ReduceMotion.System,
      }),
    );
  };

  const contenu: ReactNode = (
    <>
      <IconeHorloge size={20} color={c.pastilleActionIcone} />
      <View style={styles.textes}>
        <Texte variante="libelle" couleur={c.texteSecondaire}>
          {t('fiche.horaires')}
        </Texte>
        {aConfirmer ? (
          <Texte variante="texte" couleur={c.texteSecondaire} testID="horaires-a-confirmer">
            {valeur}
          </Texte>
        ) : (
          <Texte variante="corpsFort" style={styles.chiffres} testID="horaires-aujourdhui">
            {valeur}
          </Texte>
        )}
      </View>
      {depliable ? (
        <Animated.View style={styleChevron}>
          <IconeChevronBas size={16} color={c.texteSecondaire} />
        </Animated.View>
      ) : null}
    </>
  );

  return (
    <View testID="fiche-horaires">
      {depliable ? (
        <Pressable
          onPress={basculer}
          accessibilityRole="button"
          accessibilityLabel={libelle}
          accessibilityHint={deplie ? t('fiche.masquerSemaine') : t('fiche.voirSemaine')}
          accessibilityState={{ expanded: deplie }}
          style={({ pressed }) => [styles.ligne, pressed && styles.appuye]}
          testID="bouton-horaires"
        >
          {contenu}
        </Pressable>
      ) : (
        <View style={styles.ligne} accessible accessibilityLabel={libelle}>
          {contenu}
        </View>
      )}

      {deplie ? (
        <Animated.View entering={ENTREE_SEMAINE} exiting={SORTIE_SEMAINE} style={styles.semaine} testID="horaires-semaine">
          {ORDRE_JOURS.map((jour) => {
            const plages = plagesDu(horaires, jour);
            const fort = jour === aujourdhui;
            const nom = t(`horaires.jours.${jour}`);
            return (
              <View key={jour} style={styles.jour} accessible accessibilityLabel={`${nom} ${plages.length ? plagesLues(plages) : t('fiche.ferme')}`}>
                <Texte variante={fort ? 'nomPetit' : 'texte'} style={styles.nomJour}>
                  {majuscule(nom)}
                </Texte>
                <Texte
                  variante={fort ? 'nomPetit' : 'texte'}
                  couleur={plages.length ? undefined : c.texteSecondaire}
                  style={[styles.plages, styles.chiffres]}
                >
                  {plages.length ? plagesAffichees(plages) : t('fiche.ferme')}
                </Texte>
              </View>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: CIBLE_TACTILE },
  appuye: { opacity: 0.7 },
  textes: { flex: 1, minWidth: 0, gap: 2 },
  /** Chiffres de même largeur : les heures s'alignent d'une ligne à l'autre. */
  chiffres: { fontVariant: ['tabular-nums'] },
  semaine: { gap: 6, paddingLeft: RETRAIT_SEMAINE, paddingBottom: 14 },
  jour: { flexDirection: 'row', gap: 12 },
  nomJour: { minWidth: 48 },
  plages: { flex: 1 },
});
