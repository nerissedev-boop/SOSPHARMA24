import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { rendre } from '../../lib/tests/rendu';
import { jetonsJour, jetonsNuit } from '../../theme/jetons';
import { ombres } from '../../theme/ombres';
import { rayons } from '../../theme/rayons';
import { CartePlusProche } from '../CartePlusProche';
import { LignePharmacie } from '../LignePharmacie';

const base = {
  nom: 'Pharmacie Gazelle',
  statut: 'garde' as const,
  libelleStatut: 'Ouverte jusqu’à 23:00',
  distanceM: 900,
  marcheMin: 11,
  testID: 'l',
};

const style = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

describe('Ligne de liste imprimée (refonte v2)', () => {
  it('à plat : surface blanche le jour, sombre la nuit, ni ombre ni bordure', async () => {
    await rendre(<LignePharmacie {...base} />);
    expect(style('l').backgroundColor).toBe(jetonsJour.carte);
    expect(style('l').elevation ?? 0).toBe(0);
    expect(style('l').borderWidth ?? 0).toBe(0);
    await rendre(<LignePharmacie {...base} />, { theme: 'nuit' });
    expect(style('l').backgroundColor).toBe(jetonsNuit.carte);
  });

  it('une surface par liste : coins arrondis en haut de la première, en bas de la dernière', async () => {
    await rendre(
      <>
        <LignePharmacie {...base} testID="a" premiere derniere={false} />
        <LignePharmacie {...base} testID="b" premiere={false} derniere />
      </>,
    );
    expect(style('a').borderTopLeftRadius).toBe(rayons.surface);
    expect(style('a').borderBottomLeftRadius).toBeUndefined();
    expect(style('b').borderBottomLeftRadius).toBe(rayons.surface);
    expect(style('b').borderTopLeftRadius).toBeUndefined();
  });

  it('dense : nom, distance, état et quartier ; ni vignette, ni chevron sans fiche à ouvrir', async () => {
    await rendre(<LignePharmacie {...base} statut="ouverte" commune="Cocody Danga" />);
    expect(screen.getByText('Pharmacie Gazelle')).toBeTruthy();
    expect(screen.getByText('0,9 km')).toBeTruthy();
    expect(screen.getByText('Ouverte jusqu’à 23:00')).toBeTruthy();
    expect(screen.getByText('· Cocody Danga')).toBeTruthy();
    expect(screen.queryByTestId('l-photo')).toBeNull();
    expect(screen.queryByTestId('pastille-ouverte', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('l-chevron', { includeHiddenElements: true })).toBeNull();
  });

  it('qui ouvre la fiche : chevron tout à droite, après Appeler, et indice pour le lecteur d’écran', async () => {
    const ouvrir = jest.fn();
    await rendre(<LignePharmacie {...base} onPress={ouvrir} onAppeler={jest.fn()} />);
    const enfants = screen.getByTestId('l').children as { props: { testID?: string } }[];
    expect(enfants[enfants.length - 1]!.props.testID).toBe('l-chevron');
    expect(enfants[enfants.length - 2]!.props.testID).toBe('l-appeler');
    const chevron = screen.getByTestId('l-chevron', { includeHiddenElements: true });
    expect(screen.getByRole('button', { name: /^Pharmacie Gazelle/ }).props.accessibilityHint).toBe('Ouvre la fiche : horaires, repère et photo');
    await fireEvent.press(chevron);
    expect(ouvrir).toHaveBeenCalledTimes(1);
  });

  it('garde : distance, marche et quartier, puis le numéro ; seule la restriction est en ocre', async () => {
    await rendre(
      <LignePharmacie {...base} variante="garde" commune="Cocody" numero="27 22 44 51 20" restriction="jusqu’à 04:00" marcheJusquA={2000} />,
    );
    expect(screen.getByText('0,9 km')).toBeTruthy();
    expect(screen.getByText(/11 min · Cocody/)).toBeTruthy();
    expect(screen.getByTestId('l-numero')).toHaveTextContent('27 22 44 51 20 · jusqu’à 04:00');
    expect(StyleSheet.flatten(screen.getByText('jusqu’à 04:00').props.style).color).toBe(jetonsJour.ocreTexte);
  });

  it('marche masquée au-delà de 2 km ; badge assurance et libellé complet pour le lecteur d’écran', async () => {
    await rendre(<LignePharmacie {...base} variante="garde" assurance marcheJusquA={2000} distanceM={4200} marcheMin={52} onPress={jest.fn()} />);
    expect(screen.queryByText(/52 min/)).toBeNull();
    expect(screen.getByTestId('l-assurance')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ouverte jusqu’à 23:00, Votre assurance, 4,2 km/ })).toBeTruthy();
  });

  it('la ligne se teinte de vert pâle sous le doigt', async () => {
    await rendre(<LignePharmacie {...base} onPress={jest.fn()} />);
    const zone = screen.getByRole('button', { name: /Pharmacie Gazelle/ });
    await fireEvent(zone, 'pressIn');
    expect(style('l').backgroundColor).toBe(jetonsJour.carteAppuyee);
    await fireEvent(zone, 'pressOut');
    expect(style('l').backgroundColor).toBe(jetonsJour.carte);
  });

  it('bouton Appeler : rôle, libellé, zone tactile de 48 dp', async () => {
    const appeler = jest.fn();
    await rendre(<LignePharmacie {...base} onAppeler={appeler} />);
    const bouton = screen.getByRole('button', { name: 'Appeler Pharmacie Gazelle' });
    const aplati = StyleSheet.flatten(typeof bouton.props.style === 'function' ? bouton.props.style({ pressed: false }) : bouton.props.style);
    expect(aplati.width + 2 * (bouton.props.hitSlop ?? 0)).toBeGreaterThanOrEqual(48);
    await fireEvent.press(bouton);
    expect(appeler).toHaveBeenCalledTimes(1);
  });

  it('position à confirmer : badge à la place de la distance', async () => {
    await rendre(<LignePharmacie {...base} distanceM={null} marcheMin={null} positionAConfirmer onPress={jest.fn()} />);
    expect(screen.getByTestId('l-position')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Position à confirmer/ })).toBeTruthy();
  });
});

describe('Carte « la plus proche » (une seule, partout)', () => {
  const carte = {
    id: 'ph_1',
    nom: 'Pharmacie de la Paix',
    statut: 'garde' as const,
    libelleStatut: 'De garde, ouverte toute la nuit',
    distanceM: 700,
    marcheMin: 9,
    repere: 'Rue des Jardins · Cocody',
    testID: 'b',
  };

  it('état, nom, distance, repère, puis Appeler et Y aller ; ombre le jour, rien la nuit', async () => {
    await rendre(<CartePlusProche {...carte} onAppeler={jest.fn()} onYAller={jest.fn()} />);
    expect(screen.getByText('La plus proche')).toBeTruthy();
    expect(screen.getByText('De garde, ouverte toute la nuit')).toBeTruthy();
    expect(screen.getByTestId('b-statut-24', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('b-details')).toHaveTextContent('0,7 km · 9 min à pied');
    expect(screen.getByTestId('b-repere')).toHaveTextContent('Rue des Jardins · Cocody');
    expect(screen.getByText('Appeler')).toBeTruthy();
    expect(screen.getByText('Y aller')).toBeTruthy();
    expect(screen.queryByText('Voir la fiche')).toBeNull();
    expect(screen.queryByTestId('b-lien-fiche')).toBeNull();
    expect(screen.queryByTestId('b-photo')).toBeNull();
    expect(style('b').borderRadius).toBe(rayons.surface);
    expect(style('b').elevation).toBe(ombres.carte.elevation);
    await rendre(<CartePlusProche {...carte} onAppeler={jest.fn()} onYAller={jest.fn()} />, { theme: 'nuit' });
    expect(style('b').elevation ?? 0).toBe(0);
    expect(style('b').backgroundColor).toBe(jetonsNuit.blocProche);
  });

  it('Appeler et Y aller : 56 dp, libellés de 19 px gras', async () => {
    const appeler = jest.fn();
    const yAller = jest.fn();
    await rendre(<CartePlusProche {...carte} onAppeler={appeler} onYAller={yAller} />);
    expect(style('b-appeler').minHeight).toBe(56);
    expect(style('b-y-aller').minHeight).toBe(56);
    expect(StyleSheet.flatten(screen.getByText('Appeler').props.style).fontSize).toBe(19);
    await fireEvent.press(screen.getByRole('button', { name: 'Appeler Pharmacie de la Paix' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aller jusqu’à Pharmacie de la Paix' }));
    expect(appeler).toHaveBeenCalledTimes(1);
    expect(yAller).toHaveBeenCalledTimes(1);
  });

  it('conseil d’appeler en texte simple, juste au-dessus d’Appeler', async () => {
    await rendre(<CartePlusProche {...carte} conseil onAppeler={jest.fn()} />);
    expect(screen.getByText('La nuit, appelez avant de vous déplacer.')).toBeTruthy();
    expect(style('conseil-garde').backgroundColor).toBeUndefined();
  });

  it('variante compacte (Carte) : sans repère, la commune après la distance', async () => {
    await rendre(<CartePlusProche {...carte} compacte commune="Cocody" plusProche={false} onAppeler={jest.fn()} />);
    expect(screen.queryByTestId('b-repere')).toBeNull();
    expect(screen.getByTestId('b-details')).toHaveTextContent('0,7 km · 9 min à pied · Cocody');
    expect(screen.queryByText('La plus proche')).toBeNull();
  });

  it('position à confirmer : badge et pas de « Y aller »', async () => {
    await rendre(<CartePlusProche {...carte} distanceM={null} marcheMin={null} positionAConfirmer onAppeler={jest.fn()} onYAller={jest.fn()} />);
    expect(screen.getByTestId('b-position')).toBeTruthy();
    expect(screen.queryByText('Y aller')).toBeNull();
    expect(screen.getByTestId('b-appeler')).toBeTruthy();
  });

  it('toute la partie haute ouvre la fiche : lien vert discret, indice, teinte sous le doigt', async () => {
    const ouvrir = jest.fn();
    await rendre(<CartePlusProche {...carte} onPress={ouvrir} onAppeler={jest.fn()} />);
    const lien = screen.getByText('Horaires, repère et photo');
    expect(StyleSheet.flatten(lien.props.style).color).toBe(jetonsJour.vertTexte);
    expect(style('b-lien-fiche').backgroundColor).toBeUndefined();
    const zone = screen.getByRole('button', { name: /La plus proche : Pharmacie de la Paix/ });
    expect(zone.props.accessibilityHint).toBe('Ouvre la fiche : horaires, repère et photo');
    await fireEvent(zone, 'pressIn');
    expect(style('b').backgroundColor).toBe(jetonsJour.carteAppuyee);
    await fireEvent(zone, 'pressOut');
    expect(style('b').backgroundColor).toBe(jetonsJour.blocProche);
    await fireEvent.press(lien);
    expect(ouvrir).toHaveBeenCalledTimes(1);
  });

  it('photo de façade validée en tête de carte, sinon rien (ni devanture dessinée, ni sur le plan)', async () => {
    await rendre(<CartePlusProche {...carte} photoUrl="https://exemple.test/facade.jpg" onAppeler={jest.fn()} />);
    expect(screen.getByTestId('b-photo').props.source).toEqual({ uri: 'https://exemple.test/facade.jpg' });
    await rendre(<CartePlusProche {...carte} photoUrl={null} onAppeler={jest.fn()} />);
    expect(screen.queryByTestId('b-photo')).toBeNull();
    expect(screen.queryByTestId('b-facade')).toBeNull();
    await rendre(<CartePlusProche {...carte} compacte photoUrl="https://exemple.test/facade.jpg" onAppeler={jest.fn()} />);
    expect(screen.queryByTestId('b-photo')).toBeNull();
  });

  it('la nuit, la photo passe sous un voile : pas d’aplat clair qui éblouit', async () => {
    await rendre(<CartePlusProche {...carte} photoUrl="https://exemple.test/facade.jpg" />, { theme: 'nuit' });
    expect(style('b-photo-voile').backgroundColor).toBe(jetonsNuit.voilePhoto);
  });
});
