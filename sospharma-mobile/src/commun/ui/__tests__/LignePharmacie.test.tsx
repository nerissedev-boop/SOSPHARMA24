import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { rendre } from '../../lib/tests/rendu';
import { jetonsJour, jetonsNuit } from '../../theme/jetons';
import { rayons } from '../../theme/rayons';
import { BlocPlusProche } from '../BlocPlusProche';
import { LignePharmacie } from '../LignePharmacie';

const base = {
  nom: 'Pharmacie Gazelle',
  statut: 'garde' as const,
  libelleStatut: 'Ouverte jusqu’à 23:00',
  distanceM: 900,
  marcheMin: 11,
  testID: 'l',
};

describe('Ligne de pharmacie en carte (charte « cartes », 28 oct.)', () => {
  it('carte blanche arrondie (16) le jour, surface sombre la nuit, sans bordure', async () => {
    await rendre(<LignePharmacie {...base} />);
    const style = StyleSheet.flatten(screen.getByTestId('l').props.style);
    expect(style.borderRadius).toBe(rayons.carte);
    expect(style.backgroundColor).toBe(jetonsJour.carte);
    expect(style.borderWidth ?? 0).toBe(0);
    await rendre(<LignePharmacie {...base} />, { theme: 'nuit' });
    expect(StyleSheet.flatten(screen.getByTestId('l').props.style).backgroundColor).toBe(jetonsNuit.carte);
  });

  it('sans les nouvelles props : pastille, statut en 2e ligne, marche affichée (rétrocompatible)', async () => {
    await rendre(<LignePharmacie {...base} distanceM={4200} marcheMin={52} />);
    expect(screen.getByTestId('pastille-garde', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('l-photo')).toBeNull();
    expect(screen.getByText('Ouverte jusqu’à 23:00')).toBeTruthy();
    expect(screen.getByText('52 min')).toBeTruthy();
  });

  it('sans photo validée (null) : devanture dessinée à la place de la pastille', async () => {
    await rendre(<LignePharmacie {...base} photoUrl={null} />);
    expect(screen.getByTestId('l-facade')).toBeTruthy();
    expect(screen.queryByTestId('l-photo')).toBeNull();
    expect(screen.queryByTestId('pastille-garde', { includeHiddenElements: true })).toBeNull();
  });

  it('photo, détail, badge assurance ; marche masquée au-delà de 2 km', async () => {
    await rendre(
      <LignePharmacie
        {...base}
        photoUrl="https://exemple.test/facade.jpg"
        detail="Cocody · ouverte jusqu’à 23:00"
        detailOcre
        assurance
        marcheJusquA={2000}
        distanceM={4200}
        marcheMin={52}
      />,
    );
    expect(screen.getByTestId('l-photo').props.source).toEqual({ uri: 'https://exemple.test/facade.jpg' });
    expect(screen.queryByTestId('pastille-garde', { includeHiddenElements: true })).toBeNull();
    expect(StyleSheet.flatten(screen.getByText('Cocody · ouverte jusqu’à 23:00').props.style).color).toBe(jetonsJour.ocreTexte);
    expect(screen.getByTestId('l-assurance')).toBeTruthy();
    expect(screen.queryByText('52 min')).toBeNull();
    // Le statut complet et l'assurance restent lus par le lecteur d'écran.
    expect(screen.getByRole('button', { name: /Ouverte jusqu’à 23:00, Votre assurance, 4,2 km/ })).toBeTruthy();
  });

  it('marche affichée en deçà de 2 km', async () => {
    await rendre(<LignePharmacie {...base} marcheJusquA={2000} />);
    expect(screen.getByText('11 min')).toBeTruthy();
  });
});

describe('Bloc « La plus proche »', () => {
  const bloc = { titre: 'La plus proche de garde', nom: 'Pharmacie Alpha', statut: 'garde' as const, libelleStatut: 'Ouverte toute la nuit', distanceM: 4700, marcheMin: 59, testID: 'b' };

  it('avec photo : bandeau photo et étiquette « La plus proche », badge assurance', async () => {
    await rendre(<BlocPlusProche {...bloc} garde photoUrl="https://exemple.test/a.jpg" etiquettePhoto="La plus proche" detail="Koumassi" assurance />);
    expect(screen.getByTestId('b-photo')).toBeTruthy();
    expect(screen.getByText('La plus proche')).toBeTruthy();
    expect(screen.queryByText('La plus proche de garde')).toBeNull();
    expect(screen.getByText('Koumassi')).toBeTruthy();
    expect(screen.getByTestId('b-assurance')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('b').props.style).borderRadius).toBe(rayons.grandeCarte);
  });

  it('photo pas encore validée (null) : bandeau avec la devanture dessinée et l’étiquette', async () => {
    await rendre(<BlocPlusProche {...bloc} garde photoUrl={null} etiquettePhoto="La plus proche" />);
    expect(screen.getByTestId('b-facade')).toBeTruthy();
    expect(screen.queryByTestId('b-photo')).toBeNull();
    expect(screen.getByText('La plus proche')).toBeTruthy();
    expect(screen.queryByTestId('badge-24', { includeHiddenElements: true })).toBeNull();
  });

  it('sans photo : titre et pastille rouge « 24 » comme avant', async () => {
    await rendre(<BlocPlusProche {...bloc} garde />);
    expect(screen.queryByTestId('b-photo')).toBeNull();
    expect(screen.getByText('La plus proche de garde')).toBeTruthy();
    expect(screen.getByTestId('badge-24', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('b-assurance')).toBeNull();
  });
});

describe('Indices d’action (29 oct.)', () => {
  it('la carte se teinte de vert pâle sous le doigt', async () => {
    await rendre(<LignePharmacie {...base} onPress={jest.fn()} />);
    const zone = screen.getByRole('button', { name: /Pharmacie Gazelle/ });
    await fireEvent(zone, 'pressIn');
    expect(StyleSheet.flatten(screen.getByTestId('l').props.style).backgroundColor).toBe(jetonsJour.carteAppuyee);
    await fireEvent(zone, 'pressOut');
    expect(StyleSheet.flatten(screen.getByTestId('l').props.style).backgroundColor).toBe(jetonsJour.carte);
  });

  it('« Voir la fiche » sur le bloc qui s’ouvre, absent sans action', async () => {
    const bloc = { titre: 'La plus proche de garde', nom: 'Pharmacie Alpha', statut: 'garde' as const, libelleStatut: 'Ouverte toute la nuit', distanceM: 4700, marcheMin: 59, testID: 'b' };
    await rendre(<BlocPlusProche {...bloc} onPress={jest.fn()} />);
    expect(screen.getByText('Voir la fiche')).toBeTruthy();
    await rendre(<BlocPlusProche {...bloc} />);
    expect(screen.queryByText('Voir la fiche')).toBeNull();
  });
});

describe('Position à confirmer (31 oct.)', () => {
  it('badge sur la ligne, à la place de la distance pour le lecteur d’écran', async () => {
    await rendre(<LignePharmacie {...base} distanceM={null} marcheMin={null} positionAConfirmer onPress={jest.fn()} />);
    expect(screen.getByTestId('l-position')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Position à confirmer/ })).toBeTruthy();
  });

  it('bloc « La plus proche » : badge et pas de bouton Itinéraire', async () => {
    const bloc = { titre: 'La plus proche de garde', nom: 'Pharmacie Alpha', statut: 'garde' as const, libelleStatut: 'Ouverte toute la nuit', distanceM: null, marcheMin: null, testID: 'b' };
    await rendre(<BlocPlusProche {...bloc} positionAConfirmer onAppeler={jest.fn()} onItineraire={jest.fn()} />);
    expect(screen.getByTestId('b-position')).toBeTruthy();
    expect(screen.queryByText('Itinéraire')).toBeNull();
    expect(screen.getByTestId('b-appeler')).toBeTruthy();
  });
});
