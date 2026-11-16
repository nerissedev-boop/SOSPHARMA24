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
  commune: 'Cocody',
  adresse: 'Rue des Jardins',
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
    plusProche: true,
    libelleStatut: () => 'De garde, ouverte toute la nuit',
    tonStatut: () => 'rouge' as const,
    onOuvrir: jest.fn(),
    onAppeler: jest.fn(),
    onYAller: jest.fn(),
    onFermer: jest.fn(),
    ...surcharges,
  };
  return { props, rendu: rendre(<FeuillePharmacieCarte {...props} />) };
}

describe('Aperçu posé sur la carte : la carte « la plus proche », variante compacte', () => {
  it('fermé : rien n’est affiché', async () => {
    await rendreFeuille(null).rendu;
    expect(screen.queryByTestId('apercu-carte')).toBeNull();
  });

  it('état, nom, distance et commune, sans repère ni photo', async () => {
    await rendreFeuille(pharmacie).rendu;
    expect(screen.getByText('La plus proche')).toBeTruthy();
    expect(screen.getByText('Pharmacie Gazelle')).toBeTruthy();
    expect(screen.getByText('De garde, ouverte toute la nuit')).toBeTruthy();
    expect(screen.getByTestId('apercu-carte-details')).toHaveTextContent('0,9 km · 11 min à pied · Cocody');
    expect(screen.queryByTestId('apercu-carte-repere')).toBeNull();
    expect(screen.queryByTestId('apercu-carte-photo')).toBeNull();
  });

  it('photo de façade validée : petite vignette à gauche, jamais la grande bande', async () => {
    await rendreFeuille({ ...pharmacie, photo_url: 'https://exemple.ci/facade.jpg' }).rendu;
    expect(screen.getByTestId('apercu-carte-vignette')).toBeTruthy();
    expect(screen.queryByTestId('apercu-carte-photo')).toBeNull();
    expect(screen.getByText('Pharmacie Gazelle')).toBeTruthy();
  });

  it('sans photo : pas de vignette', async () => {
    await rendreFeuille(pharmacie).rendu;
    expect(screen.queryByTestId('apercu-carte-vignette')).toBeNull();
  });

  it('une autre pharmacie touchée sur le plan : pas d’étiquette « La plus proche »', async () => {
    await rendreFeuille(pharmacie, { plusProche: false }).rendu;
    expect(screen.queryByText('La plus proche')).toBeNull();
  });

  it('Appeler, Y aller et appui sur la carte (fiche), avec libellés d’accessibilité', async () => {
    const { props, rendu } = rendreFeuille(pharmacie);
    await rendu;
    await fireEvent.press(screen.getByLabelText('Appeler Pharmacie Gazelle'));
    expect(props.onAppeler).toHaveBeenCalledWith(pharmacie);
    await fireEvent.press(screen.getByLabelText('Aller jusqu’à Pharmacie Gazelle'));
    expect(props.onYAller).toHaveBeenCalledWith(pharmacie);
    await fireEvent.press(screen.getByRole('button', { name: /La plus proche : Pharmacie Gazelle/ }));
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
