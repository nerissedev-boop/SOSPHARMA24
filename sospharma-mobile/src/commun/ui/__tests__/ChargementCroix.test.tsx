import { act, renderHook, screen } from '@testing-library/react-native';

import { rendre } from '../../lib/tests/rendu';
import { CHARGEMENT_MINIMUM_MS, ChargementCroix, useChargementBref, useChargementVisible } from '../ChargementCroix';

describe('Croix qui bat', () => {
  it('annoncée « Chargement » aux lecteurs d’écran', async () => {
    await rendre(<ChargementCroix testID="croix" />);
    expect(screen.getByTestId('croix').props.accessibilityLabel).toBe('Chargement');
    expect(screen.getByTestId('croix').props.accessibilityRole).toBe('progressbar');
  });
});

describe('Durée d’affichage du chargement', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('une réponse rapide garde la croix visible la durée minimale', async () => {
    const { result, rerender } = await renderHook(({ actif }: { actif: boolean }) => useChargementVisible(actif), { initialProps: { actif: true } });
    expect(result.current).toBe(true);
    await rerender({ actif: false });
    expect(result.current).toBe(true);
    await act(() => jest.advanceTimersByTime(CHARGEMENT_MINIMUM_MS));
    expect(result.current).toBe(false);
  });

  it('jamais affichée si rien ne charge', async () => {
    const { result } = await renderHook(() => useChargementVisible(false));
    expect(result.current).toBe(false);
  });

  it('chargement bref : visible puis masqué après la durée', async () => {
    const { result } = await renderHook(() => useChargementBref(500));
    await act(() => result.current.declencher());
    expect(result.current.visible).toBe(true);
    await act(() => jest.advanceTimersByTime(500));
    expect(result.current.visible).toBe(false);
  });
});
