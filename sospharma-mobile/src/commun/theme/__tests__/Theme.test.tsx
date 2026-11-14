import { act, render, screen } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { usePreferences } from '../../lib/preferences';
import { FournisseurTheme, useTheme } from '../Theme';

function Sonde() {
  const theme = useTheme();
  return <Text testID="sonde">{`${theme.nom}|${theme.automatique ? 'auto' : 'manuel'}`}</Text>;
}

const rendreTheme = () =>
  render(
    <FournisseurTheme fuseau="UTC">
      <Sonde />
    </FournisseurTheme>,
  );

describe('Thème : mode nuit automatique et choix manuel', () => {
  let ecouteurs: ((etat: AppStateStatus) => void)[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    ecouteurs = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, ecouteur) => {
      ecouteurs.push(ecouteur as (etat: AppStateStatus) => void);
      return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
    });
    usePreferences.setState({ modeNuit: 'auto' });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('« auto » : jour à 12:00, nuit à 20:00 et à 05:00 (heure du pays)', async () => {
    jest.setSystemTime(new Date('2026-11-07T12:00:00Z'));
    await rendreTheme();
    expect(screen.getByTestId('sonde')).toHaveTextContent('jour|auto');
    await act(async () => {
      jest.setSystemTime(new Date('2026-11-07T20:00:00Z'));
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.getByTestId('sonde')).toHaveTextContent('nuit|auto');
    await act(async () => {
      jest.setSystemTime(new Date('2026-11-08T05:58:00Z'));
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.getByTestId('sonde')).toHaveTextContent('nuit|auto');
  });

  it('« auto » : réévalué dès le retour au premier plan, sans attendre la minute suivante', async () => {
    jest.setSystemTime(new Date('2026-11-07T18:59:30Z'));
    await rendreTheme();
    expect(screen.getByTestId('sonde')).toHaveTextContent('jour|auto');
    await act(async () => {
      jest.setSystemTime(new Date('2026-11-07T19:00:10Z'));
      ecouteurs.forEach((e) => e('active'));
    });
    expect(screen.getByTestId('sonde')).toHaveTextContent('nuit|auto');
  });

  it('le choix manuel (Profil, bouton de l’Accueil) l’emporte sur l’horaire', async () => {
    jest.setSystemTime(new Date('2026-11-07T22:00:00Z'));
    await rendreTheme();
    expect(screen.getByTestId('sonde')).toHaveTextContent('nuit|auto');
    await act(async () => usePreferences.getState().definirModeNuit('jour'));
    expect(screen.getByTestId('sonde')).toHaveTextContent('jour|manuel');
    await act(async () => usePreferences.getState().definirModeNuit('nuit'));
    jest.setSystemTime(new Date('2026-11-08T12:00:00Z'));
    await act(async () => ecouteurs.forEach((e) => e('active')));
    expect(screen.getByTestId('sonde')).toHaveTextContent('nuit|manuel');
  });
});
