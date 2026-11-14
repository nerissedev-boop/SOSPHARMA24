import { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { rendre } from '../../lib/tests/rendu';
import { jetonsJour } from '../../theme/jetons';
import { EtatVide } from '../EtatVide';
import { LignePharmacie } from '../LignePharmacie';

const base = { nom: 'Pharmacie Gazelle', distanceM: 900, marcheMin: 11, testID: 'l' };

describe('Point de statut des lignes (vert, rouge, ocre, gris + libellé court)', () => {
  it.each([
    ['ouverte', undefined, 'Ouverte', 'Pharmacie ouverte', jetonsJour.vert],
    ['garde', undefined, 'De garde', 'Pharmacie de garde', jetonsJour.rouge],
    ['ouverte', 'ocre', 'Ferme bientôt', 'Pharmacie qui ferme bientôt', jetonsJour.ocrePoint],
    ['fermee', undefined, 'Fermée', 'Pharmacie fermée', jetonsJour.texteTertiaire],
  ] as const)('%s (%s) : « %s »', async (statut, ton, court, lu, couleur) => {
    await rendre(<LignePharmacie {...base} statut={statut} ton={ton} libelleStatut="Libellé complet" />);
    const point = screen.getByTestId('l-statut');
    expect(point.props.accessibilityLabel).toBe(lu);
    expect(screen.getByText(court)).toBeTruthy();
    const pastille = screen.getByTestId('l-statut-point');
    expect(StyleSheet.flatten(pastille.props.style).backgroundColor).toBe(couleur);
  });

  it('la 2e ligne ne répète pas un libellé identique au libellé court', async () => {
    await rendre(<LignePharmacie {...base} statut="ouverte" libelleStatut="Ouverte" />);
    expect(screen.getAllByText('Ouverte')).toHaveLength(1);
  });

  it('variante favori : pas de point de statut', async () => {
    await rendre(<LignePharmacie {...base} statut="ouverte" libelleStatut="Ouverte" variante="favori" />);
    expect(screen.queryByTestId('l-statut')).toBeNull();
  });
});

describe('État vide illustré', () => {
  it('dessin « gardeVide » à la place de la loupe', async () => {
    await rendre(<EtatVide titre="Aucune pharmacie de garde trouvée" dessin="gardeVide" />);
    expect(screen.getByTestId('illustration-garde-vide', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Aucune pharmacie de garde trouvée')).toBeTruthy();
  });

  it('une illustration fournie l’emporte sur le dessin', async () => {
    await rendre(<EtatVide titre="Vide" dessin="gardeVide" illustration={<Text>perso</Text>} />);
    expect(screen.getByText('perso')).toBeTruthy();
    expect(screen.queryByTestId('illustration-garde-vide', { includeHiddenElements: true })).toBeNull();
  });
});
