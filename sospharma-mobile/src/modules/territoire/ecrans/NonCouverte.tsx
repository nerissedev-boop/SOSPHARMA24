import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { alerte, t, usePreferences } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BarreOnglets,
  BarreZone,
  Bouton,
  Ecran,
  HiGeoLocation,
  IconeHorloge,
  Texte,
  useNavigationOnglets,
} from '@/commun/ui';

import { NumerosUrgence } from '../composants/NumerosUrgence';
import { usePaysCourant, useVilles } from '../hooks/usePays';

function NonCouverte() {
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const { ville } = useLocalSearchParams<{ ville?: string }>();
  const allerOnglet = useNavigationOnglets();
  const paysCode = usePreferences((e) => e.paysCode);
  const ajouterVillePrevenue = usePreferences((e) => e.ajouterVillePrevenue);
  const { pays } = usePaysCourant();
  const villes = useVilles(paysCode);
  const ouvertes = (villes.data ?? []).filter((v) => v.statut === 'ouverte').map((v) => v.nom);
  const nom = ville && ville.length > 0 ? ville : null;

  const prevenir = () => {
    ajouterVillePrevenue(nom ?? t('nonCouverte.zoneInconnue'));
    alerte(t('nonCouverte.prevenir'), t('nonCouverte.prevenu'));
  };

  return (
    <Ecran testID="ecran-non-couverte">
      <ScrollView contentContainerStyle={styles.contenu}>
        <BarreZone
          variante="bandeau"
          libelle={nom ?? t('nonCouverte.zoneInconnue')}
          iconeNeutre
          onChanger={() => router.push('/zone')}
        />
        <View style={styles.corps}>
          <View style={[styles.illustration, { backgroundColor: c.surface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <HiGeoLocation size={52} color={c.fermeIcone} />
            <View style={[styles.horloge, { backgroundColor: c.vert }]}>
              <IconeHorloge size={22} color={c.blanc} strokeWidth={2.4} />
            </View>
          </View>
          <Texte variante="titreEcran" titre style={styles.titre}>
            {nom ? t('nonCouverte.titre', { ville: nom }) : t('nonCouverte.titreSansVille')}
          </Texte>
          <Texte variante="corps" couleur={c.texteSecondaire}>
            {t('nonCouverte.texte', { villes: ouvertes.join(', ') || '…' })}
          </Texte>
          <View style={styles.boutons}>
            <Bouton libelle={t('nonCouverte.prevenir')} icone="cloche" onPress={prevenir} />
            <Bouton libelle={t('nonCouverte.autreZone')} icone="repere" variante="secondaire" onPress={() => router.push('/zone')} />
          </View>
        </View>
        {pays && pays.urgences.length > 0 ? (
          <View style={styles.urgences}>
            <Texte variante="sectionPetite" titre>
              {t('nonCouverte.urgence', { pays: pays.nom })}
            </Texte>
            <NumerosUrgence urgences={pays.urgences} variante="grille" />
          </View>
        ) : null}
      </ScrollView>
      <BarreOnglets actif={null} onSelection={allerOnglet} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { flexGrow: 1, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 26 },
  corps: { paddingTop: 40, paddingHorizontal: 4, gap: 14 },
  illustration: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  horloge: { position: 'absolute', right: -12, bottom: -12, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titre: { marginTop: 14 },
  boutons: { gap: 10, marginTop: 8 },
  urgences: { marginTop: 'auto', paddingTop: 28, gap: 10 },
});

export default avecErrorBoundary(NonCouverte, 'NonCouverte');
