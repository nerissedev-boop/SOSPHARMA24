import { fireEvent, screen } from '@testing-library/react-native';

import type { PharmacieResume } from '@/commun/api';
import { rendre } from '@/commun/lib/tests/rendu';

import { FeuilleVerification } from '../composants/FeuilleVerification';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useLocalSearchParams: () => ({}) }));

const proche = (id: string, nom: string, distance: number) =>
  ({ id, nom, adresse: 'Rue fictive, Cocody', statut: 'ouverte', distance_m: distance }) as unknown as PharmacieResume;

function afficher(verification: { proches: PharmacieResume[]; verifiee: boolean } | null) {
  const rappels = { onModifier: jest.fn(), onCestCelleCi: jest.fn(), onEnvoyer: jest.fn() };
  return rendre(
    <FeuilleVerification
      visible
      facade={null}
      nom="Pharmacie Bel Air"
      telephone="+2250100000000"
      lieu="Cocody, Abidjan, ± 12 m"
      verification={verification}
      envoiEnCours={false}
      {...rappels}
    />,
  ).then(() => rappels);
}

describe('Feuille de vérification avant envoi (28b)', () => {
  it('montre le récapitulatif et les pharmacies connues ; « Oui » ouvre la fiche sans envoyer', async () => {
    const r = await afficher({ proches: [proche('ph_0001', 'Pharmacie Angré Château', 38), proche('ph_0002', 'Pharmacie des Jardins', 86)], verifiee: true });
    expect(screen.getByText('Pharmacie Bel Air')).toBeTruthy();
    expect(screen.getByText("Est-ce l'une de celles-ci ?")).toBeTruthy();
    expect(screen.getByText('38 m')).toBeTruthy();

    fireEvent.press(screen.getByTestId('bouton-cest-celle-ci-ph_0001'));
    expect(r.onCestCelleCi).toHaveBeenCalledWith('ph_0001');
    expect(r.onEnvoyer).not.toHaveBeenCalled();
  });

  it('« Non, c\'est une autre : envoyer » transmet les pharmacies écartées', async () => {
    const r = await afficher({ proches: [proche('ph_0001', 'A', 38), proche('ph_0002', 'B', 86)], verifiee: true });
    expect(screen.getByText("Non, c'est une autre : envoyer")).toBeTruthy();
    fireEvent.press(screen.getByTestId('bouton-confirmer-envoi'));
    expect(r.onEnvoyer).toHaveBeenCalledWith(['ph_0001', 'ph_0002']);
  });

  it('sans pharmacie proche : simple récapitulatif et « Envoyer la proposition »', async () => {
    const r = await afficher({ proches: [], verifiee: true });
    expect(screen.getByTestId('verification-aucune')).toBeTruthy();
    fireEvent.press(screen.getByText('Envoyer la proposition'));
    expect(r.onEnvoyer).toHaveBeenCalledWith([]);
  });
});
