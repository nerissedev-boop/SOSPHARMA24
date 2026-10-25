import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t, usePreferences, type RayonKm } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { Bouton, EtatVide, HiGeoLocation, HiPharmacy, IconePlus } from '@/commun/ui';

const RAYON_SUIVANT: Record<RayonKm, RayonKm | null> = { 1: 2, 2: 5, 5: null };

/** 09 « Aucune pharmacie trouvée » : élargir la zone, voir les gardes, proposer une pharmacie, actualiser. */
export function AucunResultat({ onActualiser, testID }: { onActualiser: () => void; testID?: string }) {
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const filtres = usePreferences((e) => e.filtres);
  const definirFiltres = usePreferences((e) => e.definirFiltres);
  const suivant = RAYON_SUIVANT[filtres.rayonKm];
  return (
    <View style={styles.conteneur} testID={testID ?? 'aucun-resultat'}>
      <EtatVide
        titre={t('vide.titre')}
        texte={t('vide.texte', { rayon: filtres.rayonKm })}
        titreSuggestions={t('vide.essayez')}
        suggestions={[
          ...(suivant
            ? [
                {
                  libelle: t('vide.elargir', { rayon: suivant }),
                  icone: <HiGeoLocation size={22} color={c.vertTexte} />,
                  onPress: () => definirFiltres({ ...filtres, rayonKm: suivant }),
                },
              ]
            : []),
          {
            libelle: t('vide.voirGarde'),
            icone: <HiPharmacy size={22} color={c.rouge} />,
            onPress: () => router.navigate('/garde'),
          },
          {
            libelle: t('vide.proposer'),
            icone: <IconePlus size={22} color={c.vertTexte} strokeWidth={2.2} />,
            onPress: () => router.push('/proposer'),
            accent: true,
            testID: 'suggestion-proposer',
          },
        ]}
      />
      <Bouton libelle={t('vide.actualiser')} icone="actualiser" onPress={onActualiser} style={styles.bouton} />
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { gap: 24, paddingTop: 24 },
  bouton: { alignSelf: 'stretch' },
});
