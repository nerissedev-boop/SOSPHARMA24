import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { usePreferences, useSession } from '@/commun/lib';
import { creerClientTest, rendre } from '@/commun/lib/tests/rendu';
import { jetonsJour, jetonsNuit } from '@/commun/theme/jetons';

import * as api from '../api';
import Profil from '../ecrans/Profil';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({}),
}));

describe('Écran Profil (piste A)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
    usePreferences.setState({ profil: { prenom: '', nom: '', telephone: '' }, zone: null, mesAssurances: [], modeNuit: 'auto' });
  });

  it('garde toutes les lignes et fonctions du Profil, sans bandeau ni avatar', async () => {
    await rendre(<Profil />);
    for (const texte of [
      'Profil',
      'Mes pharmacies',
      'Mes assurances',
      'Modifier',
      'Préférences',
      'Commune par défaut',
      'Pays',
      'Langue',
      'Mode nuit',
      'Nouveau tour de garde',
      'Notification chaque samedi matin',
      'Aide',
      'Nous contacter',
      'Proposer une pharmacie manquante',
      'Espace agent et pharmacien',
      'Mode démonstration : pharmacies et numéros fictifs.',
    ]) {
      expect(await screen.findByText(texte)).toBeTruthy();
    }
    expect(screen.getByTestId('case-notification-garde')).toBeTruthy();
    expect(screen.queryByTestId('bandeau-profil')).toBeNull();
    expect(screen.queryByTestId('avatar-profil')).toBeNull();
  });

  it('groupes à plat, aux couleurs des jetons jour et nuit', async () => {
    const { unmount } = await rendre(<Profil />);
    expect(await screen.findByTestId('carte-favoris')).toHaveStyle({ backgroundColor: jetonsJour.carte });
    expect(screen.getByTestId('carte-favoris').props.style).not.toEqual(expect.arrayContaining([expect.objectContaining({ elevation: expect.any(Number) })]));
    await unmount();
    await rendre(<Profil />, { theme: 'nuit' });
    expect(await screen.findByTestId('carte-favoris')).toHaveStyle({ backgroundColor: jetonsNuit.carte });
  });

  it('mes assurances : leurs noms en puces, « Modifier » ouvre le choix', async () => {
    usePreferences.setState({ mesAssurances: [{ slug: 'cmu', nom: 'CMU' }] });
    await rendre(<Profil />);
    expect(await screen.findByText('CMU')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ligne-mes-assurances'));
    expect(mockRouteur.push).toHaveBeenLastCalledWith({ pathname: '/assurances', params: { contexte: 'profil' } });
  });

  it('affiche les favoris de l’appareil et ouvre leur fiche', async () => {
    await rendre(<Profil />);
    expect(await screen.findByText('Pharmacie du Centre')).toBeTruthy();
    expect(screen.getByText('Grande Pharmacie')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('favori-ph_0101'));
    expect(mockRouteur.push).toHaveBeenCalledWith({ pathname: '/pharmacie/[id]', params: { id: 'ph_0101' } });
  });

  it('aucun favori : invite à en ajouter depuis la fiche', async () => {
    const client = creerClientTest();
    client.setQueryData(api.clesProfil.favoris, []);
    await rendre(<Profil />, { client });
    expect(await screen.findByTestId('favoris-vide')).toBeTruthy();
    expect(screen.getByText('Ajoutez une pharmacie à vos favoris depuis sa fiche.')).toBeTruthy();
  });

  it('favoris impossibles à charger : message et « Réessayer »', async () => {
    const lire = jest
      .spyOn(api, 'lireFavoris')
      .mockResolvedValue({ success: false, error: { code: 'NETWORK_ERROR', message: 'Réseau indisponible' }, meta: null, status: null });
    await rendre(<Profil />);
    expect(await screen.findByText('Vos favoris n’ont pas pu être chargés. Vérifiez votre connexion.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('favoris-reessayer'));
    await waitFor(() => expect(lire).toHaveBeenCalledTimes(2));
  });

  it('les lignes mènent aux mêmes écrans qu’avant', async () => {
    await rendre(<Profil />);
    await fireEvent.press(await screen.findByTestId('ligne-mes-assurances'));
    expect(mockRouteur.push).toHaveBeenLastCalledWith({ pathname: '/assurances', params: { contexte: 'profil' } });
    await fireEvent.press(screen.getByText('Commune par défaut'));
    expect(mockRouteur.push).toHaveBeenLastCalledWith('/zone');
    await fireEvent.press(screen.getByText('Pays'));
    expect(mockRouteur.push).toHaveBeenLastCalledWith('/zone/pays');
    await fireEvent.press(screen.getByTestId('lien-contact'));
    expect(mockRouteur.push).toHaveBeenLastCalledWith('/contact');
    await fireEvent.press(screen.getByTestId('lien-proposer'));
    expect(mockRouteur.push).toHaveBeenLastCalledWith('/proposer');
    await fireEvent.press(screen.getByTestId('lien-espace-agent'));
    expect(mockRouteur.push).toHaveBeenLastCalledWith('/agent/connexion');
  });

  it('mode nuit : les trois choix sont visibles, un appui choisit', async () => {
    await rendre(<Profil />);
    expect(await screen.findByText('Auto')).toBeTruthy();
    expect(screen.getByText('Jour')).toBeTruthy();
    expect(screen.getByTestId('mode-auto').props.accessibilityState).toEqual({ selected: true });
    await fireEvent.press(screen.getByTestId('mode-nuit'));
    expect(usePreferences.getState().modeNuit).toBe('nuit');
    await fireEvent.press(screen.getByTestId('mode-jour'));
    expect(usePreferences.getState().modeNuit).toBe('jour');
  });
});
