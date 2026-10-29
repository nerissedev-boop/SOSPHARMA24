import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { vibrationAction, vibrationErreur, vibrationLegere, vibrationSucces } from '../haptique';

describe('haptique', () => {
  beforeEach(() => jest.clearAllMocks());

  it('déclenche la vibration adaptée à chaque usage', () => {
    vibrationLegere();
    vibrationAction();
    vibrationSucces();
    vibrationErreur();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('avale les erreurs du module natif (rejet ou exception)', async () => {
    jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('pas de vibreur'));
    jest.mocked(Haptics.impactAsync).mockImplementationOnce(() => {
      throw new Error('module absent');
    });
    expect(() => vibrationLegere()).not.toThrow();
    expect(() => vibrationAction()).not.toThrow();
    // Laisse passer le rejet : aucune promesse non gérée.
    await Promise.resolve();
  });

  it('ne fait rien sur le web', () => {
    const avant = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      vibrationLegere();
      vibrationSucces();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: avant, configurable: true });
    }
  });
});
