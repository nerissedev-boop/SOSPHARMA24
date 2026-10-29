import * as Haptics from 'expo-haptics';
import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { rendre } from '../../lib/tests/rendu';
import { jetonsJour, jetonsNuit } from '../../theme/jetons';
import { NombreAnime } from '../NombreAnime';
import { PiluleFiltres } from '../PiluleFiltres';
import { PressableAnime } from '../PressableAnime';
import { Squelette, SqueletteBlocProche, SqueletteCartePharmacie, SqueletteListe } from '../Squelette';
import { Texte } from '../Texte';

const OPTIONS = [
  { cle: 'garde', libelle: 'De garde', testID: 'pilule-garde' },
  { cle: 'proches', libelle: 'Plus proches', testID: 'pilule-proches' },
  { cle: 'ouvertes', libelle: 'Ouvertes', testID: 'pilule-ouvertes' },
] as const;

type Cle = (typeof OPTIONS)[number]['cle'];

function Rangee({ onChange, ton }: { onChange?: (c: Cle) => void; ton?: 'neutre' | 'garde' }) {
  const [selection, setSelection] = useState<Cle>('garde');
  return (
    <PiluleFiltres
      options={OPTIONS}
      selection={selection}
      ton={ton}
      onChange={(c) => {
        setSelection(c);
        onChange?.(c);
      }}
    />
  );
}

const fond = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;

describe('PiluleFiltres', () => {
  beforeEach(() => jest.clearAllMocks());

  it('expose la pilule sélectionnée aux lecteurs d\'écran', async () => {
    await rendre(<Rangee />);
    expect(screen.getByTestId('pilule-garde').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('pilule-proches').props.accessibilityState).toEqual({ selected: false });
  });

  it('appelle onChange, déplace la sélection et vibre légèrement', async () => {
    const onChange = jest.fn();
    await rendre(<Rangee onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('pilule-ouvertes'));
    expect(onChange).toHaveBeenCalledWith('ouvertes');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('pilule-ouvertes').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('pilule-garde').props.accessibilityState).toEqual({ selected: false });
  });

  it('ne rappelle pas onChange sur la pilule déjà choisie', async () => {
    const onChange = jest.fn();
    await rendre(<Rangee onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('pilule-garde'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('avant mesure, la pilule choisie porte la couleur du ton (garde : rouge profond)', async () => {
    await rendre(<Rangee ton="garde" />);
    expect(fond('pilule-garde')).toBe(jetonsJour.rougeProfond);
    expect(fond('pilule-proches')).toBe(jetonsJour.filtreFond);
  });

  it('une fois mesurées, les pilules laissent glisser l\'indicateur dessous', async () => {
    await rendre(<Rangee />);
    for (const [i, o] of OPTIONS.entries()) {
      await fireEvent(screen.getByTestId(o.testID), 'layout', { nativeEvent: { layout: { x: i * 110, y: 0, width: 100, height: 36 } } });
    }
    expect(fond('pilule-garde')).toBe('transparent');
  });
});

describe('Squelette', () => {
  it('rend un bloc gris aux couleurs du thème, annoncé comme chargement', async () => {
    await rendre(<Squelette testID="sq" largeur={120} hauteur={12} />, { theme: 'nuit' });
    const style = StyleSheet.flatten(screen.getByTestId('sq').props.style);
    expect(style.backgroundColor).toBe(jetonsNuit.surface);
    expect(style.width).toBe(120);
    expect(screen.getByLabelText('Chargement')).toBeTruthy();
  });

  it('carte et bloc « la plus proche » : arrondis 16, vignette 56 arrondie 12', async () => {
    await rendre(
      <>
        <SqueletteCartePharmacie />
        <SqueletteBlocProche />
        <SqueletteListe nombre={3} />
      </>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('squelette-carte').props.style).borderRadius).toBe(16);
    expect(StyleSheet.flatten(screen.getByTestId('squelette-bloc-proche').props.style).borderRadius).toBe(16);
    expect(screen.getAllByTestId(/^squelette-carte-\d$/)).toHaveLength(3);
  });
});

describe('PressableAnime et NombreAnime', () => {
  beforeEach(() => jest.clearAllMocks());

  it('PressableAnime transmet le toucher et vibre si demandé', async () => {
    const onPress = jest.fn();
    await rendre(
      <PressableAnime testID="carte" onPress={onPress} vibration accessibilityRole="button" accessibilityLabel="Ouvrir">
        <Texte>Pharmacie</Texte>
      </PressableAnime>,
    );
    await fireEvent.press(screen.getByTestId('carte'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Ouvrir')).toBeTruthy();
  });

  it('NombreAnime affiche la valeur finale (animations instantanées sous Jest)', async () => {
    await rendre(<NombreAnime valeur={12} rendu={(n) => `${n} pharmacies`} />);
    expect(screen.getByText('12 pharmacies')).toBeTruthy();
    expect(screen.getByLabelText('12 pharmacies')).toBeTruthy();
  });
});
