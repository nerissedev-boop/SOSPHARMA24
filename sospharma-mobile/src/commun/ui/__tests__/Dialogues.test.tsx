import { act, fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { alerte, useDialogues } from '../../lib/dialogues';
import { rendre } from '../../lib/tests/rendu';
import { jetonsJour } from '../../theme/jetons';
import { HoteDialogues } from '../HoteDialogues';

const fond = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style)?.backgroundColor;

// Le premier rendu charge Feuille, Modal et Reanimated : jusqu'à 20 s et plus sur une machine chargée.
jest.setTimeout(60_000);

describe('Dialogues de la charte (remplacent Alert.alert)', () => {
  beforeEach(() => act(() => useDialogues.setState({ courant: null, ouvert: false })));

  it('affiche titre, message et un « OK » neutre quand aucun bouton n’est donné', async () => {
    await rendre(<HoteDialogues />);
    await act(() => alerte('Appeler', 'Pas de numéro pour cette pharmacie.'));
    expect(screen.getByText('Appeler')).toBeTruthy();
    expect(screen.getByText('Pas de numéro pour cette pharmacie.')).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();
    expect(fond('dialogue-bouton-0')).toBe(jetonsJour.boutonSecondaire);
  });

  it('montre tous les choix (Android en coupait au-delà de 3), le premier en vert, « Annuler » en dernier', async () => {
    const ouvrir = jest.fn();
    await rendre(<HoteDialogues />);
    await act(() =>
      alerte('Ouvrir avec', 'Choisissez l’application.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Google Maps', onPress: () => ouvrir('google') },
        { text: 'Yango', onPress: () => ouvrir('yango') },
        { text: 'Autre application', onPress: () => ouvrir('systeme') },
      ]),
    );
    expect(screen.getByTestId('dialogue-bouton-0')).toHaveTextContent('Google Maps');
    expect(screen.getByTestId('dialogue-bouton-3')).toHaveTextContent('Annuler');
    expect(fond('dialogue-bouton-0')).toBe(jetonsJour.vert);
    expect(fond('dialogue-bouton-1')).toBe(jetonsJour.pastilleAction);
    expect(fond('dialogue-bouton-3')).toBe(jetonsJour.boutonSecondaire);

    await fireEvent.press(screen.getByTestId('dialogue-bouton-1'));
    expect(ouvrir).toHaveBeenCalledWith('yango');
    expect(useDialogues.getState().ouvert).toBe(false);
  });

  it('met une action destructrice en rouge', async () => {
    await rendre(<HoteDialogues />);
    await act(() => alerte('Quitter', 'Des relevés attendent.', [{ text: 'Rester', style: 'cancel' }, { text: 'Quitter', style: 'destructive' }]));
    expect(fond('dialogue-bouton-0')).toBe(jetonsJour.rouge);
  });
});
