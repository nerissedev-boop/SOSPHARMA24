import { fireEvent, screen } from '@testing-library/react-native';

import { rendre } from '../../lib/tests/rendu';
import { jetonsJour } from '../../theme/jetons';
import { BarreOnglets } from '../BarreOnglets';
import { HiAmbulance24px, HiGeoLocation, HiGeoLocationOutline, HiHome, HiHomeOutline } from '../icones/healthicons';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn() }) }));

/** Rendu JSON d'un élément, pour comparer une icône à celle qu'on attend. */
async function rendu(element: React.ReactElement): Promise<string> {
  await rendre(element);
  return JSON.stringify(screen.toJSON());
}

/** Début du premier tracé : il suffit à reconnaître l'icône. */
function extrait(json: string): string {
  const debut = json.indexOf('"d"');
  // Sans tracé, toContain('') passerait toujours : le test échoue plutôt que de mentir.
  if (debut < 0) throw new Error('Aucun tracé dans ce rendu');
  return json.slice(debut, debut + 80);
}

describe('Barre d’onglets', () => {
  it('Urgence : l’ambulance blanche dans le rond rouge, pas un « + » qui se lirait « ajouter »', async () => {
    const ambulance = await rendu(<HiAmbulance24px size={20} color={jetonsJour.blanc} />);
    await rendre(<BarreOnglets actif="accueil" onSelection={jest.fn()} />);
    expect(JSON.stringify(screen.toJSON())).toContain(extrait(ambulance));
  });

  it.each([
    ['accueil', HiHome, HiHomeOutline],
    ['carte', HiGeoLocation, HiGeoLocationOutline],
  ] as const)('%s : plein quand l’onglet est actif, en contour au repos', async (cle, Plein, Contour) => {
    const plein = await rendu(<Plein size={26} color={jetonsJour.ongletActif} />);
    const contour = await rendu(<Contour size={26} color={jetonsJour.ongletInactif} />);

    await rendre(<BarreOnglets actif={cle} onSelection={jest.fn()} />);
    expect(JSON.stringify(screen.toJSON())).toContain(extrait(plein));

    await rendre(<BarreOnglets actif={cle === 'accueil' ? 'carte' : 'accueil'} onSelection={jest.fn()} />);
    expect(JSON.stringify(screen.toJSON())).toContain(extrait(contour));
  });

  it('un appui sur un onglet le transmet', async () => {
    const onSelection = jest.fn();
    await rendre(<BarreOnglets actif="accueil" onSelection={onSelection} />);
    await fireEvent.press(screen.getByTestId('onglet-urgence'));
    expect(onSelection).toHaveBeenCalledWith('urgence');
  });
});
