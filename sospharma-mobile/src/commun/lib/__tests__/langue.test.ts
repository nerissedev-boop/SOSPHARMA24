import { dateCourte, distanceKm } from '../format';
import { appliquerLangue, langueActive, t } from '../i18n';

const SAMEDI = '2026-10-24T08:00:00Z';

describe('langue de l’interface', () => {
  afterEach(() => appliquerLangue('fr'));

  it('suit le téléphone par défaut (français dans les tests)', () => {
    appliquerLangue('auto');
    expect(langueActive()).toBe('fr');
    expect(t('garde.titre')).toBe('Pharmacies de garde');
  });

  it('passe en anglais : textes, pluriels, dates et nombres', () => {
    appliquerLangue('en');
    expect(langueActive()).toBe('en');
    expect(t('garde.titre')).toBe('On-duty pharmacies');
    expect(t('garde.ouvertesNuit', { count: 6 })).toBe('6 pharmacies open tonight');
    expect(t('garde.ouvertesNuit', { count: 1 })).toBe('1 pharmacy open tonight');
    expect(dateCourte(SAMEDI, 'Africa/Abidjan')).toBe('Sat 24 Oct');
    expect(distanceKm(4700)).toBe('4.7 km');
  });

  it('garde les formats français en français', () => {
    appliquerLangue('fr');
    expect(dateCourte(SAMEDI, 'Africa/Abidjan')).toBe('sam. 24 oct.');
    expect(distanceKm(4700)).toBe('4,7 km');
  });
});
