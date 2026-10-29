import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { t } from '../lib/i18n';
import { CIBLE_TACTILE } from '../theme/espacements';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { policeTexte, type Variante } from '../theme/typographie';
import { HiGeoLocationOutline, HiPharmacyOutline, HiPhone, HiUiUserProfileOutline } from './icones/healthicons';
import { IconeBulle, IconeCadenas, IconeCoche, IconeEnveloppe, IconeHorloge, IconeOeil, IconeRecherche } from './icones/trait';
import { Texte } from './Texte';

/** Icônes des champs de saisie (charte, « Champs de saisie », ajout du 21 oct.). */
export type IconeChamp = 'email' | 'cadenas' | 'telephone' | 'whatsapp' | 'horloge' | 'pharmacie' | 'profil' | 'recherche' | 'lieu';

function rendreIconeChamp(nom: IconeChamp, couleur: string, taille: number): ReactNode {
  switch (nom) {
    case 'email':
      return <IconeEnveloppe size={taille} color={couleur} strokeWidth={2} />;
    case 'cadenas':
      return <IconeCadenas size={taille} color={couleur} />;
    case 'telephone':
      return <HiPhone size={taille} color={couleur} />;
    case 'whatsapp':
      return <IconeBulle size={taille} color={couleur} />;
    case 'horloge':
      return <IconeHorloge size={taille} color={couleur} />;
    case 'pharmacie':
      return <HiPharmacyOutline size={taille} color={couleur} />;
    case 'profil':
      return <HiUiUserProfileOutline size={taille} color={couleur} />;
    case 'recherche':
      return <IconeRecherche size={taille} color={couleur} />;
    case 'lieu':
      return <HiGeoLocationOutline size={taille} color={couleur} />;
  }
}

/**
 * État visuel d'un champ : vide = aplat gris et icône grise ; actif (focus) ou rempli =
 * aplat vert clair et icône verte. Arrondi de 14 (charte « cartes », 28 oct.), jamais de bordure.
 */
export function useEtatChamp(valeur: string | undefined, props: Pick<TextInputProps, 'onFocus' | 'onBlur'>) {
  const { couleurs: c } = useTheme();
  const [focus, setFocus] = useState(false);
  const actif = focus || Boolean(valeur && valeur.length > 0);
  return {
    actif,
    fond: actif ? c.vertClair : c.champ,
    icone: actif ? c.vert : c.texteTertiaire,
    onFocus: ((e) => {
      setFocus(true);
      props.onFocus?.(e);
    }) satisfies NonNullable<TextInputProps['onFocus']>,
    onBlur: ((e) => {
      setFocus(false);
      props.onBlur?.(e);
    }) satisfies NonNullable<TextInputProps['onBlur']>,
  };
}

type PropsChamp = Omit<TextInputProps, 'style'> & {
  /** Libellé : affiché au-dessus du champ (sauf `libelleMasque`) et lu par les lecteurs d'écran. */
  libelle: string;
  libelleMasque?: boolean;
  varianteLibelle?: Variante;
  icone: IconeChamp;
  /** Élément d'icône personnalisé : reçoit la couleur de l'état (gris ou vert). */
  rendreIcone?: (couleur: string) => ReactNode;
  tailleIcone?: number;
  hauteur?: number;
  taillePolice?: number;
  /** Champ mot de passe : texte masqué et bouton « œil » pour l'afficher. */
  motDePasse?: boolean;
  erreur?: string;
  testID?: string;
};

/** Champ de saisie de la charte : icône à gauche, fond selon l'état, œil pour le mot de passe. */
export function ChampSaisie({
  libelle,
  libelleMasque = false,
  varianteLibelle = 'boutonPetit',
  icone,
  rendreIcone,
  tailleIcone = 22,
  hauteur = 54,
  taillePolice = 15,
  motDePasse = false,
  erreur,
  testID,
  value,
  onFocus,
  onBlur,
  ...props
}: PropsChamp) {
  const { couleurs: c } = useTheme();
  const etat = useEtatChamp(value, { onFocus, onBlur });
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.champConteneur}>
      {libelleMasque ? null : (
        <Texte variante={varianteLibelle} importantForAccessibility="no" accessibilityElementsHidden>
          {libelle}
        </Texte>
      )}
      <View
        testID={testID ? `${testID}-fond` : undefined}
        style={[
          styles.champ,
          { height: hauteur, backgroundColor: etat.fond, paddingLeft: hauteur < 50 ? 12 : 14, paddingRight: motDePasse ? 4 : hauteur < 50 ? 12 : 14, gap: hauteur < 50 ? 10 : 12 },
        ]}
      >
        <View testID={testID ? `${testID}-icone-${etat.actif ? 'active' : 'inactive'}` : undefined}>
          {rendreIcone ? rendreIcone(etat.icone) : rendreIconeChamp(icone, etat.icone, tailleIcone)}
        </View>
        <TextInput
          testID={testID}
          accessibilityLabel={libelle}
          placeholderTextColor={c.texteTertiaire}
          secureTextEntry={motDePasse && !visible}
          autoCapitalize={motDePasse ? 'none' : props.autoCapitalize}
          autoCorrect={motDePasse ? false : props.autoCorrect}
          value={value}
          onFocus={etat.onFocus}
          onBlur={etat.onBlur}
          style={[styles.saisie, { color: c.texte, fontSize: taillePolice, fontFamily: policeTexte(400) }]}
          {...props}
        />
        {motDePasse ? (
          <Pressable
            testID={testID ? `${testID}-oeil` : undefined}
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? t('champs.masquerMotDePasse') : t('champs.afficherMotDePasse')}
            style={styles.oeil}
          >
            <IconeOeil size={22} color={c.texteTertiaire} strokeWidth={2} barre={visible} />
          </Pressable>
        ) : null}
      </View>
      {erreur ? (
        <Texte variante="libelleMoyen" couleur={c.rougeTexte} accessibilityLiveRegion="polite">
          {erreur}
        </Texte>
      ) : null}
    </View>
  );
}

type PropsRecherche = Omit<TextInputProps, 'style'> & {
  /** Libellé lu par les lecteurs d'écran (masqué à l'écran, comme dans les maquettes). */
  libelle: string;
  icone?: ReactNode;
  /** Icône personnalisée qui suit l'état (gris vide, vert actif ou rempli). */
  rendreIcone?: (couleur: string) => ReactNode;
  hauteur?: number;
  taillePolice?: number;
};

/** Champ de recherche : icône loupe à gauche ; gris vide, vert clair actif ou rempli. */
export function ChampRecherche({ libelle, icone, rendreIcone, hauteur = 46, taillePolice = 14, value, onFocus, onBlur, ...props }: PropsRecherche) {
  const { couleurs: c } = useTheme();
  const etat = useEtatChamp(value, { onFocus, onBlur });
  return (
    <View style={[styles.recherche, { height: hauteur, backgroundColor: etat.fond }]} testID={props.testID ? `${props.testID}-fond` : undefined}>
      {rendreIcone ? rendreIcone(etat.icone) : (icone ?? <IconeRecherche size={20} color={etat.icone} />)}
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={c.texteTertiaire}
        returnKeyType="search"
        autoCorrect={false}
        value={value}
        onFocus={etat.onFocus}
        onBlur={etat.onBlur}
        style={[styles.saisie, { color: c.texte, fontSize: taillePolice, fontFamily: policeTexte(400) }]}
        {...props}
      />
    </View>
  );
}

type PropsZoneTexte = Omit<TextInputProps, 'style'> & { libelle: string; lignes?: number; erreur?: string };

/** Zone de texte multiligne : aplat gris vide, vert clair active ou remplie, sans bordure. */
export function ZoneTexte({ libelle, lignes = 3, erreur, value, onFocus, onBlur, ...props }: PropsZoneTexte) {
  const { couleurs: c } = useTheme();
  const etat = useEtatChamp(value, { onFocus, onBlur });
  return (
    <View style={styles.zoneConteneur}>
      <TextInput
        accessibilityLabel={libelle}
        multiline
        numberOfLines={lignes}
        textAlignVertical="top"
        placeholderTextColor={c.texteTertiaire}
        style={[
          styles.zone,
          { backgroundColor: etat.fond, color: c.texte, minHeight: 24 + lignes * 21, fontFamily: policeTexte(400) },
        ]}
        value={value}
        onFocus={etat.onFocus}
        onBlur={etat.onBlur}
        {...props}
      />
      {erreur ? (
        <Texte variante="libelleMoyen" couleur={c.rougeTexte} accessibilityLiveRegion="polite">
          {erreur}
        </Texte>
      ) : null}
    </View>
  );
}

type PropsCase = { coche: boolean; onChange: (v: boolean) => void; libelle: string; testID?: string };

/** Case à cocher (petit arrondi, pas de bordure) : gris vide, vert coché. */
export function CaseACocher({ coche, onChange, libelle, testID }: PropsCase) {
  const { couleurs: c, estNuit } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => onChange(!coche)}
      accessibilityRole="checkbox"
      accessibilityLabel={libelle}
      accessibilityState={{ checked: coche }}
      hitSlop={11}
      style={[styles.case, { backgroundColor: coche ? c.vert : estNuit ? c.boutonSecondaire : '#E5E7EB' }]}
    >
      {coche ? <IconeCoche size={16} color={c.blanc} strokeWidth={3} /> : null}
    </Pressable>
  );
}

/** Bouton radio (rond : élément réellement circulaire). */
export function PointRadio({ actif }: { actif: boolean }) {
  const { couleurs: c, estNuit } = useTheme();
  return (
    <View style={[styles.radio, { backgroundColor: actif ? c.vert : estNuit ? c.boutonSecondaire : '#E5E7EB' }]}>
      {actif ? <View style={[styles.radioPoint, { backgroundColor: c.blanc }]} /> : null}
    </View>
  );
}

type Segment<T extends string> = { valeur: T; libelle: string };

/** Sélecteur à deux segments (« A à Z / Par distance ») : aplat gris, segment actif blanc. */
export function Segments<T extends string>({
  segments,
  valeur,
  onChange,
  libelle,
}: {
  segments: Segment<T>[];
  valeur: T;
  onChange: (v: T) => void;
  libelle: string;
}) {
  const { couleurs: c } = useTheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={libelle} style={[styles.segments, { backgroundColor: c.surface }]}>
      {segments.map((s) => {
        const actif = s.valeur === valeur;
        return (
          <Pressable
            key={s.valeur}
            testID={`segment-${s.valeur}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            onPress={() => onChange(s.valeur)}
            style={[styles.segment, { backgroundColor: actif ? c.feuille : 'transparent' }]}
          >
            <Texte variante="boutonPetit" couleur={actif ? c.texte : c.texteSecondaire}>
              {s.libelle}
            </Texte>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  champConteneur: { gap: 6 },
  champ: { flexDirection: 'row', alignItems: 'center', borderRadius: rayons.moyen },
  oeil: { width: CIBLE_TACTILE, height: CIBLE_TACTILE, alignItems: 'center', justifyContent: 'center' },
  recherche: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: rayons.moyen },
  // Pas de contour de focus du navigateur (version web) : l'état actif est rendu par le fond vert clair.
  saisie: { flex: 1, minWidth: 0, paddingVertical: 0, height: '100%', outlineWidth: 0 },
  zoneConteneur: { gap: 6 },
  zone: { padding: 12, fontSize: 14, borderRadius: rayons.moyen },
  case: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: rayons.mini },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  radioPoint: { width: 8, height: 8, borderRadius: 4 },
  segments: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: rayons.moyen },
  segment: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: rayons.petit },
});

export const HAUTEUR_CIBLE = CIBLE_TACTILE;
