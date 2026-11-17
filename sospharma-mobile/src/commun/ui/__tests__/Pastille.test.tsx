import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { rendre } from '../../lib/tests/rendu';
import { jetonsJour } from '../../theme/jetons';
import { LignePharmacie } from '../LignePharmacie';
import { PastilleStatut } from '../PastilleStatut';

describe('PastilleStatut', () => {
  it('ouverte : pastille verte ronde avec la croix, sans « 24 »', async () => {
    await rendre(<PastilleStatut statut="ouverte" taille={40} />);
    const style = StyleSheet.flatten(screen.getByTestId('pastille-ouverte', { includeHiddenElements: true }).props.style);
    expect(style.backgroundColor).toBe(jetonsJour.vert);
    expect(style.borderRadius).toBe(20);
    expect(screen.queryByTestId('pastille-24', { includeHiddenElements: true })).toBeNull();
  });

  it('de garde : « 24 » à la place de la croix, la forme distingue la garde sans la couleur', async () => {
    await rendre(<PastilleStatut statut="garde" taille={46} />);
    expect(StyleSheet.flatten(screen.getByTestId('pastille-garde', { includeHiddenElements: true }).props.style).backgroundColor).toBe(jetonsJour.rouge);
    const vingtQuatre = screen.getByTestId('pastille-24', { includeHiddenElements: true });
    expect(vingtQuatre).toHaveTextContent('24');
    // Dessiné dans un disque de taille fixe : il ne grossit pas avec la police système.
    expect(vingtQuatre.props.allowFontScaling).toBe(false);
  });

  it('ferme bientôt : pastille ocre, croix foncée (le blanc y serait illisible)', async () => {
    await rendre(<PastilleStatut statut="ouverte" ton="ocre" />);
    expect(StyleSheet.flatten(screen.getByTestId('pastille-ouverte', { includeHiddenElements: true }).props.style).backgroundColor).toBe(jetonsJour.ocrePoint);
  });

  it('fermée : pastille gris clair, sans bordure', async () => {
    await rendre(<PastilleStatut statut="fermee" />);
    const style = StyleSheet.flatten(screen.getByTestId('pastille-fermee', { includeHiddenElements: true }).props.style);
    expect(style.backgroundColor).toBe(jetonsJour.fermeFond);
    expect(style.borderWidth ?? 0).toBe(0);
  });

  it('peut être annoncée aux lecteurs d\'écran', async () => {
    await rendre(<PastilleStatut statut="garde" annoncee />);
    expect(screen.getByLabelText('Pharmacie de garde')).toBeTruthy();
  });
});

describe('LignePharmacie', () => {
  it('affiche nom, état coloré, distance et minutes à pied (variante garde)', async () => {
    await rendre(
      <LignePharmacie variante="garde" nom="Pharmacie de la Paix" statut="garde" libelleStatut="De garde cette nuit" distanceM={700} marcheMin={9} commune="Cocody" />,
    );
    expect(screen.getByText('Pharmacie de la Paix')).toBeTruthy();
    expect(screen.getByText('0,7 km')).toBeTruthy();
    expect(screen.getByText(/9 min · Cocody/)).toBeTruthy();
  });

  it('état coloré dans la variante dense : rouge pour la garde, gris pour la fermée', async () => {
    await rendre(<LignePharmacie nom="Pharmacie de la Paix" statut="garde" libelleStatut="De garde cette nuit" distanceM={700} marcheMin={9} />);
    expect(StyleSheet.flatten(screen.getByText('De garde cette nuit').props.style).color).toBe(jetonsJour.rougeTexteFort);
    await rendre(<LignePharmacie nom="Grande Pharmacie" statut="fermee" libelleStatut="Fermée, ouvre à 07:00" distanceM={1180} marcheMin={15} />);
    expect(StyleSheet.flatten(screen.getByText('Fermée, ouvre à 07:00').props.style).color).toBe(jetonsJour.texteSecondaire);
    expect(screen.getByText('1,2 km')).toBeTruthy();
  });

  it('appui sur la ligne : la fiche ; appui sur le rond : l’appel', async () => {
    const appeler = jest.fn();
    const ouvrir = jest.fn();
    await rendre(
      <LignePharmacie nom="Pharmacie du Centre" statut="ouverte" libelleStatut="Ouverte 24h/24" distanceM={440} marcheMin={6} onPress={ouvrir} onAppeler={appeler} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Appeler Pharmacie du Centre' }));
    expect(appeler).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Pharmacie du Centre, Ouverte 24h/24, 0,4 km' }));
    expect(ouvrir).toHaveBeenCalledTimes(1);
  });

  it('sans numéro : pas de bouton d’appel', async () => {
    await rendre(<LignePharmacie nom="Pharmacie du Centre" statut="ouverte" libelleStatut="Ouverte 24h/24" distanceM={440} marcheMin={6} />);
    expect(screen.queryByRole('button', { name: /Appeler/ })).toBeNull();
  });
});
