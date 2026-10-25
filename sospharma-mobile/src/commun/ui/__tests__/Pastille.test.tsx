import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { rendre } from '../../lib/tests/rendu';
import { jetonsJour } from '../../theme/jetons';
import { LignePharmacie } from '../LignePharmacie';
import { PastilleStatut } from '../PastilleStatut';

describe('PastilleStatut', () => {
  it('ouverte : pastille verte ronde, sans badge 24', async () => {
    await rendre(<PastilleStatut statut="ouverte" taille={40} badge24 />);
    const style = StyleSheet.flatten(screen.getByTestId('pastille-ouverte', { includeHiddenElements: true }).props.style);
    expect(style.backgroundColor).toBe(jetonsJour.vert);
    expect(style.borderRadius).toBe(20);
    expect(screen.queryByTestId('badge-24', { includeHiddenElements: true })).toBeNull();
  });

  it('de garde : pastille rouge avec badge 24', async () => {
    await rendre(<PastilleStatut statut="garde" taille={46} badge24 />);
    expect(StyleSheet.flatten(screen.getByTestId('pastille-garde', { includeHiddenElements: true }).props.style).backgroundColor).toBe(jetonsJour.rouge);
    expect(screen.getByText('24', { includeHiddenElements: true })).toBeTruthy();
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
  it('affiche nom, statut coloré, distance et minutes à pied', async () => {
    await rendre(
      <LignePharmacie nom="Pharmacie de la Paix" statut="garde" libelleStatut="De garde cette nuit" distanceM={700} marcheMin={9} />,
    );
    expect(screen.getByText('Pharmacie de la Paix')).toBeTruthy();
    expect(screen.getByText('0,7 km')).toBeTruthy();
    expect(screen.getByText('9 min')).toBeTruthy();
    const statut = screen.getByText('De garde cette nuit');
    expect(StyleSheet.flatten(statut.props.style).color).toBe(jetonsJour.rougeTexteFort);
  });

  it('statut fermé en gris', async () => {
    await rendre(
      <LignePharmacie nom="Grande Pharmacie" statut="fermee" libelleStatut="Fermée, ouvre à 07:00" distanceM={1180} marcheMin={15} />,
    );
    expect(StyleSheet.flatten(screen.getByText('Fermée, ouvre à 07:00').props.style).color).toBe(jetonsJour.texteTertiaire);
    expect(screen.getByText('1,2 km')).toBeTruthy();
  });

  it('bouton Appeler accessible (rôle, libellé, cible 44 px) et actions', async () => {
    const appeler = jest.fn();
    const ouvrir = jest.fn();
    await rendre(
      <LignePharmacie
        nom="Pharmacie du Centre"
        statut="ouverte"
        libelleStatut="Ouverte 24h/24"
        distanceM={440}
        marcheMin={6}
        onPress={ouvrir}
        onAppeler={appeler}
      />,
    );
    const bouton = screen.getByRole('button', { name: 'Appeler Pharmacie du Centre' });
    const style = StyleSheet.flatten(
      typeof bouton.props.style === 'function' ? bouton.props.style({ pressed: false }) : bouton.props.style,
    );
    expect(style.width).toBeGreaterThanOrEqual(44);
    await fireEvent.press(bouton);
    expect(appeler).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Pharmacie du Centre, Ouverte 24h/24, 0,4 km' }));
    expect(ouvrir).toHaveBeenCalledTimes(1);
  });

  it('variante favori : pas de bouton d\'appel', async () => {
    await rendre(<LignePharmacie variante="favori" nom="Pharmacie du Centre" statut="ouverte" libelleStatut="Ouverte 24h/24" distanceM={440} marcheMin={6} />);
    expect(screen.queryByRole('button', { name: /Appeler/ })).toBeNull();
  });
});
