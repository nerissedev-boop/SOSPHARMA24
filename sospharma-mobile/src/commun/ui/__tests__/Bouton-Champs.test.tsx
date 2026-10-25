import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { rendre } from '../../lib/tests/rendu';
import { jetonsJour } from '../../theme/jetons';
import { Bouton } from '../Bouton';
import { ChampSaisie } from '../Champs';
import { NOMS_ICONES } from '../icones/actions';

function styleAplati(element: { props: { style?: unknown } }) {
  const style = element.props.style;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style) ?? {};
}

describe('Bouton avec icône', () => {
  it('affiche l’icône nommée à gauche du libellé, écart 10 px, sans bordure ni arrondi', async () => {
    await rendre(<Bouton libelle="Envoyer le signalement" icone="envoyer" testID="b" />);
    const bouton = screen.getByTestId('b');
    expect(screen.getByTestId('icone-envoyer')).toBeTruthy();
    const style = styleAplati(bouton);
    expect(style.gap).toBe(10);
    expect(style.borderRadius ?? 0).toBe(0);
    expect(style.borderWidth ?? 0).toBe(0);
    // L'icône précède le libellé.
    expect(JSON.stringify(screen.toJSON())).toMatch(/icone-envoyer[\s\S]*Envoyer le signalement/);
  });

  it('place la flèche « continuer » à droite du libellé', async () => {
    await rendre(<Bouton libelle="Continuer" icone="continuer" />);
    expect(JSON.stringify(screen.toJSON())).toMatch(/Continuer[\s\S]*icone-continuer/);
  });

  it('garde le libellé accessible et toutes les icônes de la table de la charte existent', async () => {
    const onPress = jest.fn();
    await rendre(<Bouton libelle="Valider (2)" icone="valider" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Valider (2)' }));
    expect(onPress).toHaveBeenCalled();
    for (const nom of ['envoyer', 'valider', 'naviguer', 'voir', 'actualiser', 'ajouter', 'continuer', 'annuler', 'localisation', 'carte', 'cloche', 'lune', 'repere']) {
      expect(NOMS_ICONES).toContain(nom);
    }
  });

  it('un lien texte reste sans icône', async () => {
    await rendre(<Bouton libelle="Mot de passe oublié" variante="lien" />);
    expect(screen.queryByTestId(/^icone-/)).toBeNull();
  });
});

describe('Champ de saisie', () => {
  it('vide : fond gris et icône grise ; rempli : fond vert clair et icône verte', async () => {
    const { rerender } = await rendre(<ChampSaisie libelle="E-mail" icone="email" value="" testID="c" />);
    expect(screen.getByTestId('c-icone-inactive')).toBeTruthy();
    expect(styleAplati(screen.getByTestId('c-fond')).backgroundColor).toBe(jetonsJour.champ);
    await rerender(<ChampSaisie libelle="E-mail" icone="email" value="k.yao@sospharma24.ci" testID="c" />);
    expect(screen.getByTestId('c-icone-active')).toBeTruthy();
    expect(styleAplati(screen.getByTestId('c-fond')).backgroundColor).toBe(jetonsJour.vertClair);
  });

  it('actif (focus) : fond vert clair même vide', async () => {
    await rendre(<ChampSaisie libelle="Nom" icone="pharmacie" value="" testID="c" />);
    await fireEvent(screen.getByTestId('c'), 'focus');
    expect(screen.getByTestId('c-icone-active')).toBeTruthy();
    await fireEvent(screen.getByTestId('c'), 'blur');
    expect(screen.getByTestId('c-icone-inactive')).toBeTruthy();
  });

  it('mot de passe : masqué par défaut, bouton œil accessible qui l’affiche', async () => {
    await rendre(<ChampSaisie libelle="Mot de passe" icone="cadenas" motDePasse value="secret" testID="m" />);
    expect(screen.getByTestId('m').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(screen.getByTestId('m').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Masquer le mot de passe' })).toBeTruthy();
  });

  it('libellé visible et lu, sans bordure', async () => {
    await rendre(<ChampSaisie libelle="Téléphone" icone="telephone" testID="t" />);
    // Libellé affiché, masqué aux lecteurs d'écran (déjà annoncé par le champ lui-même).
    expect(screen.getByText('Téléphone', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('Téléphone')).toBeTruthy();
    expect(styleAplati(screen.getByTestId('t-fond')).borderWidth ?? 0).toBe(0);
  });
});
