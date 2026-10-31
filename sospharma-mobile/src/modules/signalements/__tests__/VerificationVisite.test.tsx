import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { ABSENCE_MIN_VISITE_MS, useDialogues, useVisite } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import { VerificationVisite } from '../composants/VerificationVisite';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

const PHARMACIE = { id: 'ph_0142', nom: 'Pharmacie de la Paix' };

beforeEach(() => {
  useVisite.setState({ enCours: null, aDemander: null, dejaDemandees: {} });
});

describe('Suivi de visite', () => {
  it('demande au retour après une vraie absence, une seule fois par jour', () => {
    const depart = Date.now();
    useVisite.getState().commencer(PHARMACIE, depart);
    useVisite.getState().retourDansLApp(depart + ABSENCE_MIN_VISITE_MS);
    expect(useVisite.getState().aDemander?.id).toBe('ph_0142');

    useVisite.getState().terminer();
    useVisite.getState().commencer(PHARMACIE, depart + 60_000);
    expect(useVisite.getState().enCours).toBeNull();
  });

  it('ne demande rien après une absence trop courte (appel sans réponse)', () => {
    const depart = Date.now();
    useVisite.getState().commencer(PHARMACIE, depart);
    useVisite.getState().retourDansLApp(depart + 3_000);
    expect(useVisite.getState().aDemander).toBeNull();
    expect(useVisite.getState().enCours).toBeNull();
  });
});

describe('Question « Était-elle ouverte ? »', () => {
  it('apparaît au retour dans l’app et se ferme sur « Oui »', async () => {
    let ecouteur: ((etat: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, rappel) => {
      ecouteur = rappel as (etat: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    await rendre(<VerificationVisite />);
    useVisite.setState({ enCours: { ...PHARMACIE, depuis: Date.now() - ABSENCE_MIN_VISITE_MS } });

    await act(async () => {
      ecouteur?.('background');
      ecouteur?.('active');
    });
    expect(screen.getByText('Pharmacie de la Paix était-elle ouverte ?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('visite-ouverte'));
    expect(useVisite.getState().aDemander).toBeNull();
  });

  it('« Non, c’était fermé » envoie un signalement et remercie', async () => {
    useVisite.setState({ aDemander: { ...PHARMACIE, depuis: Date.now() } });
    await rendre(<VerificationVisite />);
    await fireEvent.press(screen.getByTestId('visite-fermee'));
    expect(useVisite.getState().aDemander).toBeNull();
    // Le remerciement passe par l'hôte des dialogues, posé à la racine de l'app.
    await waitFor(() => expect(useDialogues.getState().courant?.message).toBe('Votre signalement a été envoyé. Nous vérifions cette pharmacie.'));
  });
});
