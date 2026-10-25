import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { alerte, estContexteAssurances, t, usePreferences, useSelectionAssurances, type ContexteAssurances } from '@/commun/lib';
import { ombres, policeTexte, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  CaseACocher,
  ChampRecherche,
  ChampSaisie,
  Ecran,
  EnTete,
  HiInsuranceCardOutline,
  IconePlus,
  PiedFixe,
  Texte,
  useRetour,
} from '@/commun/ui';

import { grouperAssurances, useAssurances } from '../hooks/useAssurances';

/** Recherche sans accents ni casse (« mugef » trouve « MUGEF-CI »). */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr');
}

function LigneAssurance({ nom, coche, onChange, testID }: { nom: string; coche: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const { couleurs: c } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!coche)}
      accessible={false}
      style={[styles.ligne, { backgroundColor: coche ? c.vertClair : 'transparent' }]}
    >
      <HiInsuranceCardOutline size={24} color={c.texte} />
      <Texte variante="corps" style={[styles.nom, { fontFamily: policeTexte(coche ? 700 : 500) }]}>
        {nom}
      </Texte>
      <CaseACocher coche={coche} onChange={onChange} libelle={nom} testID={testID} />
    </Pressable>
  );
}

/**
 * 16b Choix des assurances (modal), réutilisé par les Filtres, le Profil (« Mes assurances »)
 * et la fiche de relevé de l'agent. `?contexte=filtres|profil|releve`.
 */
function ChoixAssurances() {
  const router = useRouter();
  const fermer = useRetour();
  const { couleurs: c, estNuit } = useTheme();
  const params = useLocalSearchParams<{ contexte?: string }>();
  const contexte: ContexteAssurances = estContexteAssurances(params.contexte) ? params.contexte : 'filtres';
  const { data: referentiel, isPending, error } = useAssurances();
  const mesAssurances = usePreferences((e) => e.mesAssurances);
  const definirMesAssurances = usePreferences((e) => e.definirMesAssurances);
  const definirSelection = useSelectionAssurances((e) => e.definir);
  const definirProposees = useSelectionAssurances((e) => e.definirProposees);
  const [choix, setChoix] = useState<string[]>(() =>
    contexte === 'profil' ? mesAssurances.map((a) => a.slug) : useSelectionAssurances.getState().selections[contexte],
  );
  const [proposees, setProposees] = useState<string[]>(() => useSelectionAssurances.getState().proposees[contexte]);
  const [recherche, setRecherche] = useState('');
  const [saisieLibre, setSaisieLibre] = useState<string | null>(null);

  const groupes = useMemo(() => {
    const q = normaliser(recherche.trim());
    const liste = (referentiel ?? []).filter((a) => !q || normaliser(a.nom).includes(q) || a.slug.includes(q));
    return grouperAssurances(liste);
  }, [referentiel, recherche]);

  const nombre = choix.length + proposees.length;
  const basculer = (slug: string, v: boolean) => setChoix((l) => (v ? [...l, slug] : l.filter((x) => x !== slug)));

  const absente = () => {
    if (contexte === 'releve') {
      setSaisieLibre('');
      return;
    }
    alerte(t('assurances.absenteTitre'), t('assurances.absenteUsager'), [
      { text: t('commun.annuler'), style: 'cancel' },
      { text: t('assurances.direNous'), onPress: () => router.push('/contact') },
    ]);
  };

  const ajouterLibre = () => {
    const nom = (saisieLibre ?? '').trim();
    if (nom.length < 2) return;
    setProposees((l) => [...new Set([...l, nom])]);
    setSaisieLibre(null);
  };

  const valider = () => {
    if (contexte === 'profil') {
      const parSlug = new Map((referentiel ?? []).map((a) => [a.slug, a.nom]));
      definirMesAssurances(choix.map((slug) => ({ slug, nom: parSlug.get(slug) ?? slug })));
    }
    definirSelection(contexte, choix);
    definirProposees(contexte, proposees);
    fermer();
  };

  return (
    <Ecran testID="ecran-choix-assurances">
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={[styles.entete, { backgroundColor: c.fond }, !estNuit && ombres.enTete]}>
          <EnTete
            titre={t('assurances.titre')}
            icone="fermer"
            onRetour={fermer}
            droite={
              <Texte variante="petit" couleur={c.texteSecondaire} testID="nombre-choisies">
                {t('assurances.choisies', { count: nombre })}
              </Texte>
            }
          />
          <ChampRecherche
            libelle={t('assurances.recherche')}
            placeholder={t('assurances.recherche')}
            hauteur={50}
            taillePolice={15}
            value={recherche}
            onChangeText={setRecherche}
            testID="recherche-assurance"
          />
        </View>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          {isPending ? <ActivityIndicator color={c.vert} style={styles.chargement} /> : null}
          {error && !referentiel ? (
            <Texte variante="texte" couleur={c.texteSecondaire} style={styles.chargement}>
              {t('assurances.indisponible')}
            </Texte>
          ) : null}
          {groupes.map((g) => (
            <View key={g.type}>
              <Texte variante="petit" couleur={c.vertTexte} titre style={styles.groupe}>
                {t(`assurances.types.${g.type}`)}
              </Texte>
              {g.assurances.map((a) => (
                <LigneAssurance
                  key={a.slug}
                  nom={a.nom}
                  coche={choix.includes(a.slug)}
                  onChange={(v) => basculer(a.slug, v)}
                  testID={`case-assurance-${a.slug}`}
                />
              ))}
            </View>
          ))}
          {referentiel && groupes.length === 0 ? (
            <Texte variante="texte" couleur={c.texteSecondaire} style={styles.chargement}>
              {t('assurances.aucune')}
            </Texte>
          ) : null}
          {proposees.length > 0 ? (
            <View>
              <Texte variante="petit" couleur={c.vertTexte} titre style={styles.groupe}>
                {t('assurances.proposees')}
              </Texte>
              {proposees.map((nom) => (
                <LigneAssurance
                  key={nom}
                  nom={nom}
                  coche
                  onChange={(v) => (v ? undefined : setProposees((l) => l.filter((x) => x !== nom)))}
                />
              ))}
            </View>
          ) : null}
          {saisieLibre !== null ? (
            <View style={styles.libre}>
              <ChampSaisie
                libelle={t('assurances.nomLibre')}
                icone="recherche"
                rendreIcone={(couleur) => <HiInsuranceCardOutline size={22} color={couleur} />}
                hauteur={50}
                autoFocus
                value={saisieLibre}
                onChangeText={setSaisieLibre}
                onSubmitEditing={ajouterLibre}
                returnKeyType="done"
                testID="champ-assurance-libre"
              />
              <Bouton libelle={t('assurances.proposer')} icone="ajouter" variante="clair" typo="boutonPetit" onPress={ajouterLibre} />
            </View>
          ) : (
            <Pressable onPress={absente} accessibilityRole="button" style={styles.absente} testID="bouton-assurance-absente">
              <IconePlus size={18} color={c.vertTexte} strokeWidth={2.4} />
              <Texte variante="boutonPetit" couleur={c.vertTexte}>
                {t('assurances.absente')}
              </Texte>
            </Pressable>
          )}
        </ScrollView>
        <PiedFixe>
          <Bouton
            libelle={t('assurances.valider', { nombre })}
            icone="valider"
            hauteur={54}
            typo="boutonGrand"
            onPress={valider}
            testID="bouton-valider-assurances"
          />
        </PiedFixe>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  entete: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 12, gap: 12, zIndex: 1 },
  contenu: { paddingTop: 4, paddingHorizontal: 20, paddingBottom: 24 },
  chargement: { marginTop: 24 },
  groupe: { marginTop: 12, marginBottom: 2, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  ligne: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginHorizontal: -12 },
  nom: { flex: 1, lineHeight: 20 },
  absente: { minHeight: 48, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  libre: { marginTop: 12, gap: 10 },
});

export default avecErrorBoundary(ChoixAssurances, 'ChoixAssurances');
