import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PlageHoraire } from '@/commun/api';
import { alerte, t } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { Bouton, CaseACocher, ChampSaisie, Feuille, Texte } from '@/commun/ui';

import { abregeJour, normaliserHeure, ORDRE_JOURS } from '../horaires';

type Ligne = { ouverte: boolean; ouverture: string; fermeture: string };

type Props = {
  visible: boolean;
  horaires: PlageHoraire[];
  onFermer: () => void;
  onValider: (horaires: PlageHoraire[]) => void;
};

function versLignes(horaires: PlageHoraire[]): Record<number, Ligne> {
  return Object.fromEntries(
    ORDRE_JOURS.map((jour) => {
      const plage = horaires.find((h) => h.jour === jour);
      return [jour, { ouverte: Boolean(plage), ouverture: plage?.ouverture ?? '08:00', fermeture: plage?.fermeture ?? '21:00' }];
    }),
  );
}

/** Saisie des horaires affichés, jour par jour (une plage par jour, fermée si décochée). */
export function EditeurHoraires({ visible, horaires, onFermer, onValider }: Props) {
  const { couleurs: c } = useTheme();
  const [lignes, setLignes] = useState(() => versLignes(horaires));
  // À chaque ouverture, la saisie repart des horaires du relevé.
  const [etaitVisible, setEtaitVisible] = useState(visible);
  if (visible !== etaitVisible) {
    setEtaitVisible(visible);
    if (visible) setLignes(versLignes(horaires));
  }
  const maj = (jour: number, partiel: Partial<Ligne>) => setLignes((l) => ({ ...l, [jour]: { ...(l[jour] as Ligne), ...partiel } }));

  const valider = () => {
    const resultat: PlageHoraire[] = [];
    for (const jour of ORDRE_JOURS) {
      const l = lignes[jour];
      if (!l?.ouverte) continue;
      const ouverture = normaliserHeure(l.ouverture);
      const fermeture = normaliserHeure(l.fermeture);
      if (!ouverture || !fermeture) {
        alerte(t('releve.horaires'), t('releve.heureInvalide', { jour: abregeJour(jour) }));
        return;
      }
      resultat.push({ jour, ouverture, fermeture });
    }
    onValider(resultat);
  };

  return (
    <Feuille
      visible={visible}
      onFermer={onFermer}
      titre={t('releve.horairesTitre')}
      defilement
      pied={
        <>
          <Bouton libelle={t('releve.validerHoraires')} icone="valider" onPress={valider} testID="bouton-valider-horaires" />
          <Bouton libelle={t('commun.annuler')} icone="annuler" variante="secondaire" onPress={onFermer} />
        </>
      }
    >
          <View style={styles.contenu}>
            {ORDRE_JOURS.map((jour) => {
              const l = lignes[jour] as Ligne;
              const nom = abregeJour(jour);
              return (
                <View key={jour} style={styles.jour}>
                  <CaseACocher coche={l.ouverte} onChange={(v) => maj(jour, { ouverte: v })} libelle={t('releve.ouvertLe', { jour: nom })} />
                  <Texte variante="corpsFort" style={styles.nomJour}>
                    {nom.charAt(0).toLocaleUpperCase('fr') + nom.slice(1)}
                  </Texte>
                  {l.ouverte ? (
                    <View style={styles.heures}>
                      <View style={styles.heure}>
                        <ChampSaisie
                          libelle={t('releve.ouvertureLe', { jour: nom })}
                          libelleMasque
                          icone="horloge"
                          tailleIcone={18}
                          hauteur={44}
                          taillePolice={14}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          value={l.ouverture}
                          onChangeText={(v) => maj(jour, { ouverture: v })}
                        />
                      </View>
                      <View style={styles.heure}>
                        <ChampSaisie
                          libelle={t('releve.fermetureLe', { jour: nom })}
                          libelleMasque
                          icone="horloge"
                          tailleIcone={18}
                          hauteur={44}
                          taillePolice={14}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          value={l.fermeture}
                          onChangeText={(v) => maj(jour, { fermeture: v })}
                        />
                      </View>
                    </View>
                  ) : (
                    <Texte variante="petit" couleur={c.texteSecondaire} style={styles.fermee}>
                      {t('releve.fermee')}
                    </Texte>
                  )}
                </View>
              );
            })}
          </View>
    </Feuille>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 6 },
  jour: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nomJour: { width: 44 },
  heures: { flex: 1, flexDirection: 'row', gap: 8 },
  heure: { flex: 1 },
  fermee: { flex: 1 },
});
