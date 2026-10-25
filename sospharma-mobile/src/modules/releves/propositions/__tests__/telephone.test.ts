import { numeroInternational } from '../telephone';

describe('numeroInternational', () => {
  it('ajoute l\'indicatif du pays à un numéro local', () => {
    expect(numeroInternational('01 02 03 04 05', '+225')).toBe('+2250102030405');
  });

  it('garde un numéro déjà international et convertit le préfixe 00', () => {
    expect(numeroInternational('+225 07 77 88 99 00', '+225')).toBe('+2250777889900');
    expect(numeroInternational('00225 0102030405', '+225')).toBe('+2250102030405');
  });

  it('renvoie null pour un champ vide, et la saisie brute si elle est inexploitable', () => {
    expect(numeroInternational('   ', '+225')).toBeNull();
    expect(numeroInternational('12 34', '+225')).toBe('1234');
    expect(numeroInternational('0102030405', undefined)).toBe('0102030405');
  });
});
