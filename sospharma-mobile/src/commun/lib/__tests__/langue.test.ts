import { HORAIRES_DEFAUT, resumeHoraires } from '@/modules/releves/horaires';

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

  it('résume les horaires d’un relevé en anglais', () => {
    appliquerLangue('en');
    expect(resumeHoraires(HORAIRES_DEFAUT)).toBe('Mon to Sat 08:00 to 21:00, Sun closed');
    expect(resumeHoraires([], true)).toBe('Open 24 hours, 7 days a week');
  });
});
