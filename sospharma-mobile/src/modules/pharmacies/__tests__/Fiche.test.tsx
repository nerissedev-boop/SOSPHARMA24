import { screen } from '@testing-library/react-native';

import { reinitialiserDemoAgent } from '@/commun/api';
import { useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import Fiche from '../ecrans/Fiche';
import { messageChauffeur } from '../chauffeur';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  jest.clearAllMocks();
  reinitialiserDemoAgent();
  useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
});

describe('Fiche pharmacie', () => {
  it('horaires des 7 jours, du lundi au dimanche', async () => {
    mockParams = { id: 'ph_0155' };
    await rendre(<Fiche />);
    expect(await screen.findByTestId('horaires-semaine')).toBeTruthy();
    expect(screen.getByText('Lun.')).toBeTruthy();
    expect(screen.getByText('Dim.')).toBeTruthy();
  });

  it('sans numéro WhatsApp : pas de bouton WhatsApp ; sans photo : devanture dessinée', async () => {
    mockParams = { id: 'ph_0155' };
    await rendre(<Fiche />);
    await screen.findByTestId('horaires-semaine');
    expect(screen.queryByText('WhatsApp')).toBeNull();
    expect(screen.getByTestId('fiche-facade')).toBeTruthy();
  });

  it('avec un numéro WhatsApp : le bouton est là', async () => {
    mockParams = { id: 'ph_0142' };
    await rendre(<Fiche />);
    expect(await screen.findByText('WhatsApp')).toBeTruthy();
  });
});

describe('Message pour le chauffeur', () => {
  it('destination, adresse, commune, lien de position et téléphone', () => {
    const message = messageChauffeur(
      {
        nom: 'Pharmacie de la Paix',
        adresse: 'Rue des Jardins',
        commune: 'Cocody',
        ville: 'Abidjan',
        telephone: '0102030405',
        latitude: 5.36,
        longitude: -3.98,
      },
      '+225',
    );
    const lignes = message.split('\n');
    expect(lignes[0]).toBe('Destination : Pharmacie de la Paix');
    expect(lignes[1]).toBe('Rue des Jardins');
    expect(lignes[2]).toBe('Cocody, Abidjan');
    expect(lignes[3]).toMatch(/^Position : https?:\/\/.*5\.36/);
    expect(lignes[4]).toMatch(/^Tél\. de la pharmacie : /);
  });
});
