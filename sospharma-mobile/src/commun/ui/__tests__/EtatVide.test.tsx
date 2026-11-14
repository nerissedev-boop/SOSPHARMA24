import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { rendre } from '../../lib/tests/rendu';
import { EtatVide } from '../EtatVide';
import { RepereStatut } from '../RepereStatut';

describe('Repère d’état : la croix de l’officine, le « 24 » pour la garde, toujours avec un texte', () => {
  it.each([
    ['ouverte', undefined, 'Ouverte', 'Pharmacie ouverte', false],
    ['garde', undefined, 'De garde', 'Pharmacie de garde', true],
    ['ouverte', 'ocre', 'Ferme bientôt', 'Pharmacie qui ferme bientôt', false],
    ['fermee', undefined, 'Fermée', 'Pharmacie fermée', false],
  ] as const)('%s (%s) : « %s »', async (statut, ton, court, lu, badge24) => {
    await rendre(<RepereStatut statut={statut} ton={ton} testID="r" />);
    expect(screen.getByTestId('r').props.accessibilityLabel).toBe(lu);
    expect(screen.getByText(court)).toBeTruthy();
    expect(Boolean(screen.queryByTestId('r-24', { includeHiddenElements: true }))).toBe(badge24);
  });

  it('un libellé complet est affiché et lu tel quel', async () => {
    await rendre(<RepereStatut statut="ouverte" libelle="Ouverte jusqu’à 22:00" testID="r" />);
    expect(screen.getByTestId('r').props.accessibilityLabel).toBe('Ouverte jusqu’à 22:00');
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

  it('« aucun » : pas de dessin, la phrase suffit (hors connexion)', async () => {
    await rendre(<EtatVide titre="Pas de réseau" dessin="aucun" />);
    expect(screen.queryByTestId('illustration-garde-vide', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Pas de réseau')).toBeTruthy();
  });
});
