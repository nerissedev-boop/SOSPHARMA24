import { appliquerLangue } from '@/commun/lib';

import { HORAIRES_DEFAUT, resumeHoraires } from '../horaires';

describe('résumé des horaires selon la langue', () => {
  afterEach(() => appliquerLangue('fr'));

  it('résume les horaires d’un relevé en anglais', () => {
    appliquerLangue('en');
    expect(resumeHoraires(HORAIRES_DEFAUT)).toBe('Mon to Sat 08:00 to 21:00, Sun closed');
    expect(resumeHoraires([], true)).toBe('Open 24 hours, 7 days a week');
  });
});
