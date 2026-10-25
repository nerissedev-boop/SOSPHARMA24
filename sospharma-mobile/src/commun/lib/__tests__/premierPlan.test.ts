import {
  ABSENCE_AVANT_DEMARRAGE_MS,
  marquerSortieVersAutreApp,
  marquerSortieVolontaire,
  noterDepart,
  rejouerDemarrageAuRetour,
} from '../premierPlan';

describe('écran du logo au retour au premier plan', () => {
  beforeEach(() => {
    // Remet l'état à zéro entre deux cas.
    noterDepart(0);
    rejouerDemarrageAuRetour(0);
  });

  it('rejoue le logo après une sortie par la touche retour, même brève', () => {
    marquerSortieVolontaire();
    noterDepart(1_000);
    expect(rejouerDemarrageAuRetour(3_000)).toBe(true);
  });

  it('reprend l’écran quitté après un appel ou Maps, même long', () => {
    marquerSortieVersAutreApp();
    noterDepart(0);
    expect(rejouerDemarrageAuRetour(ABSENCE_AVANT_DEMARRAGE_MS * 3)).toBe(false);
  });

  it('reprend l’écran après une courte absence (bouton d’accueil)', () => {
    noterDepart(0);
    expect(rejouerDemarrageAuRetour(ABSENCE_AVANT_DEMARRAGE_MS - 1)).toBe(false);
  });

  it('rejoue le logo après 5 minutes d’absence', () => {
    noterDepart(0);
    expect(rejouerDemarrageAuRetour(ABSENCE_AVANT_DEMARRAGE_MS)).toBe(true);
  });

  it('ne rejoue rien sans départ (premier montage de l’app)', () => {
    marquerSortieVolontaire();
    expect(rejouerDemarrageAuRetour(10_000_000)).toBe(false);
  });

  it('oublie le départ après chaque retour', () => {
    marquerSortieVolontaire();
    noterDepart(0);
    rejouerDemarrageAuRetour(0);
    expect(rejouerDemarrageAuRetour(ABSENCE_AVANT_DEMARRAGE_MS * 2)).toBe(false);
  });
});
