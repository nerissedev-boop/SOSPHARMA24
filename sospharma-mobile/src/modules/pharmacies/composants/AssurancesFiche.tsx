import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import type { AssurancePharmacie } from '@/commun/api';
import { t } from '@/commun/lib';
import { policeTexte, rayons, useTheme } from '@/commun/theme';
import { DUREES, Texte } from '@/commun/ui';

import { trierAssurancesFiche, useMesAssurances } from '../hooks/useAssurances';

/** Puces visibles avant « + N autres ». */
const MAX_PUCES = 3;
/** Au-delà, les puces dépliées apparaissent ensemble : la liste ne doit pas traîner. */
const RANG_MAX_CASCADE = 6;
/** Puces de 32 de haut : la zone tactile de « + N autres » atteint 44. */
const MARGE_TOUCHE = 6;

/** Puce dépliée par « + N autres » : fondu court, en cascade. */
function apparitionPuce(rang: number) {
  return FadeIn.duration(DUREES.glissement)
    .delay(Math.min(rang, RANG_MAX_CASCADE) * DUREES.cascade)
    .reduceMotion(ReduceMotion.System);
}

type Props = {
  assurances: AssurancePharmacie[];
  services: string[];
};

/**
 * Assurances acceptées (piste A) : les vôtres d'abord, en vert foncé, puis les autres en puces
 * neutres ; 3 puces au plus, puis « + N autres » qui déplie (les puces révélées apparaissent en
 * fondu, en cascade). Les services suivent en une ligne.
 */
export function AssurancesFiche({ assurances, services }: Props) {
  const { couleurs: c } = useTheme();
  const { slugs: miennes } = useMesAssurances();
  const [deplie, setDeplie] = useState(false);
  const triees = trierAssurancesFiche(assurances, miennes);
  const visibles = deplie ? triees : triees.slice(0, MAX_PUCES);
  const reste = triees.length - visibles.length;
  const nomsServices = services.map((s) => t(`services.${s}`, { defaultValue: s }).toLocaleLowerCase('fr'));
  if (triees.length === 0 && nomsServices.length === 0) return null;

  return (
    <View style={styles.bloc} testID="section-assurances">
      {triees.length > 0 ? (
        <>
          <Texte variante="libelle" couleur={c.texteSecondaire} titre>
            {t('fiche.assurances', { count: triees.length })}
          </Texte>
          <View style={styles.puces}>
            {visibles.map((a, i) => {
              const mienne = miennes.includes(a.slug);
              const lu = [a.nom, a.tiers_payant ? t('fiche.tiersPayant') : null, mienne ? t('commun.votreAssurance') : null]
                .filter(Boolean)
                .join(', ');
              return (
                <Animated.View
                  key={a.id}
                  entering={i >= MAX_PUCES ? apparitionPuce(i - MAX_PUCES) : undefined}
                  accessible
                  accessibilityLabel={lu}
                  style={[styles.puce, { backgroundColor: mienne ? c.puceForteFond : c.puceFond }]}
                  testID={`puce-fiche-${a.slug}`}
                >
                  <Texte variante="petitFort" couleur={mienne ? c.puceForteTexte : c.texte}>
                    {a.nom}
                  </Texte>
                  {a.tiers_payant ? (
                    <Texte variante="mini" couleur={mienne ? c.puceForteTexte : c.texteSecondaire}>
                      {t('fiche.tiersPayant')}
                    </Texte>
                  ) : null}
                </Animated.View>
              );
            })}
            {reste > 0 ? (
              <Pressable
                onPress={() => setDeplie(true)}
                accessibilityRole="button"
                hitSlop={MARGE_TOUCHE}
                style={({ pressed }) => [styles.puce, { backgroundColor: c.puceFond }, pressed && styles.appuye]}
                testID="bouton-autres-assurances"
              >
                <Texte variante="petitFort" couleur={c.vertTexte} style={styles.gras}>
                  {t('fiche.autresAssurances', { count: reste })}
                </Texte>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
      {nomsServices.length > 0 ? (
        <Texte variante="petit" couleur={c.texteSecondaire}>
          {t('fiche.servicesListe', { services: nomsServices.join(', ') })}
        </Texte>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { paddingVertical: 12, gap: 8 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  puce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rayons.repere,
  },
  appuye: { opacity: 0.7 },
  /** « + N autres » est une action : texte vert, en gras. */
  gras: { fontFamily: policeTexte(700) },
});
