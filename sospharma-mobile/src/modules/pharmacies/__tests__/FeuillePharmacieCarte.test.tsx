import { act, fireEvent, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import type { PharmacieResume } from '@/commun/api';
import { rendre } from '@/commun/lib/tests/rendu';

import { FeuillePharmacieCarte } from '../composants/FeuillePharmacieCarte';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn() }) }));

const pharmacie = {
  id: 'ph_1',
  nom: 'Pharmacie Gazelle',
  statut: 'garde',
  distance_m: 900,
  marche_min: 11,
  telephone: '+2250700000000',
  whatsapp: null,
  latitude: 5.36,
  longitude: -3.98,
  photo_url: null,
} as unknown as PharmacieResume;

function rendreFeuille(p: PharmacieResume | null, surcharges: Partial<Parameters<typeof FeuillePharmacieCarte>[0]> = {}) {
  const props = {
    pharmacie: p,
    libelleStatut: () => 'De garde',
    onOuvrir: jest.fn(),
    onAppeler: jest.fn(),
    onItineraire: jest.fn(),
    onFermer: jest.fn(),
    ...surcharges,
  };
  return { props, rendu: rendre(<FeuillePharmacieCarte {...props} />) };
}

describe('Aperçu pharmacie sur la carte', () => {
  it('fermé : rien n’est affiché', async () => {
    await rendreFeuille(null).rendu;
    expect(screen.queryByTestId('apercu-carte')).toBeNull();
  });

  it('sans photo : devanture dessinée, nom, statut et distance', async () => {
    await rendreFeuille(pharmacie).rendu;
    expect(screen.getByTestId('apercu-carte-facade')).toBeTruthy();
    expect(screen.queryByTestId('apercu-carte-photo')).toBeNull();
    expect(screen.getByText('Pharmacie Gazelle')).toBeTruthy();
    expect(screen.getByText('De garde')).toBeTruthy();
    expect(screen.getByText('0,9 km')).toBeTruthy();
  });

  it('avec photo : la photo de façade remplace le dessin', async () => {
    await rendreFeuille({ ...pharmacie, photo_url: 'https://exemple.test/facade.jpg' }).rendu;
    expect(screen.getByTestId('apercu-carte-photo', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('apercu-carte-facade')).toBeNull();
  });

  it('Appeler, Itinéraire et appui sur l’aperçu (fiche), avec libellés d’accessibilité', async () => {
    const { props, rendu } = rendreFeuille(pharmacie);
    await rendu;
    await fireEvent.press(screen.getByLabelText('Appeler Pharmacie Gazelle'));
    expect(props.onAppeler).toHaveBeenCalledWith(pharmacie);
    await fireEvent.press(screen.getByLabelText('Itinéraire vers Pharmacie Gazelle'));
    expect(props.onItineraire).toHaveBeenCalledWith(pharmacie);
    await fireEvent.press(screen.getByTestId('apercu-carte-ouvrir'));
    expect(props.onOuvrir).toHaveBeenCalledWith(pharmacie);
  });

  it('bouton retour d’Android : ferme l’aperçu', async () => {
    const espion = jest.spyOn(BackHandler, 'addEventListener');
    const { props, rendu } = rendreFeuille(pharmacie);
    await rendu;
    const rappel = espion.mock.calls.find(([nom]) => nom === 'hardwareBackPress')?.[1];
    expect(rappel).toBeDefined();
    act(() => {
      rappel?.({} as Parameters<NonNullable<typeof rappel>>[0]);
    });
    expect(props.onFermer).toHaveBeenCalled();
    espion.mockRestore();
  });
});
