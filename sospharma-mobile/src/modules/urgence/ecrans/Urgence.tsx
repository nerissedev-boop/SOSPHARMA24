import { ScrollView, StyleSheet, View } from 'react-native';

import { comparerDistance, repereEtCommune, t } from '@/commun/lib';
import { libelleStatut, tonAffiche } from '@/commun/regles';
import { CIBLE_TACTILE, espacements, rayons, useTheme } from '@/commun/theme';
import { avecErrorBoundary, Bouton, CartePlusProche, Ecran, IconeLune, Texte, useNavigationOnglets } from '@/commun/ui';
import { useTourEnCours } from '@/modules/gardes';
import { useActionsPharmacie } from '@/modules/pharmacies';
import { NumerosUrgence, usePaysCourant, useZoneCourante } from '@/modules/territoire';

/** Hauteur dont la carte de la garde la plus proche remonte sur le bandeau. */
const CHEVAUCHEMENT = 52;

/**
 * 08 Urgence (refonte v2, 14 nov.) : trois appels, un appui chacun. La garde la plus proche dans la
 * même carte que l'Accueil, puis le SAMU et les sapeurs-pompiers en un seul bloc. Plus de disque
 * SOS, d'anneaux ni de halo : rien ne bouge sur cet écran. La nuit, le rouge reste dans le bandeau
 * et le reste de l'écran est sombre.
 */
function Urgence() {
  const allerOnglet = useNavigationOnglets();
  const { couleurs: c, estNuit } = useTheme();
  const { pays, fuseau } = usePaysCourant();
  const { zone, libelle: libelleZone } = useZoneCourante();
  const { tour } = useTourEnCours();
  const actions = useActionsPharmacie();
  const plusProche = [...(tour?.pharmacies ?? [])]
    .filter((p) => p.statut === 'garde')
    .sort(comparerDistance)[0];

  return (
    // La barre d'état prend la couleur du bandeau ; le reste de l'écran garde le fond du thème.
    <Ecran fond={c.sosFond} barreClaire testID="ecran-urgence">
      <ScrollView style={{ backgroundColor: c.fond }} contentContainerStyle={styles.contenu}>
        <View style={[styles.bandeau, plusProche && styles.bandeauChevauche, { backgroundColor: c.sosFond }]} testID="bandeau-urgence">
          <Texte variante="titreFort" titre couleur={c.sosTexte}>
            {t('urgence.titre')}
          </Texte>
          {zone ? (
            <Texte variante="corpsFort" couleur={c.sosTexte} numberOfLines={2} testID="urgence-zone">
              {libelleZone}
            </Texte>
          ) : null}
          <Texte variante="petit" couleur={c.sosTexte}>
            {t('urgence.unAppui')}
          </Texte>
        </View>

        {plusProche ? (
          <CartePlusProche
            id={plusProche.id}
            testID="urgence-plus-proche"
            nom={plusProche.nom}
            statut={plusProche.statut}
            ton={tonAffiche(plusProche, fuseau)}
            libelleStatut={libelleStatut(plusProche, fuseau, 'carte')}
            distanceM={plusProche.distance_m}
            marcheMin={plusProche.marche_min}
            repere={repereEtCommune(plusProche)}
            positionAConfirmer={plusProche.latitude === null}
            conseil={estNuit}
            onPress={() => actions.ouvrir(plusProche)}
            onAppeler={plusProche.telephone ? () => actions.appeler(plusProche) : undefined}
            onYAller={() => actions.itineraire(plusProche)}
            style={styles.chevauchement}
          />
        ) : null}

        {/* Numéros de la configuration pays : rien n'est écrit en dur, pas de ligne sans numéro connu. */}
        {pays && pays.urgences.length > 0 ? (
          <>
            <Texte variante="section" titre style={styles.etiquette}>
              {t('urgence.secours')}
            </Texte>
            <NumerosUrgence urgences={pays.urgences} grand />
          </>
        ) : null}

        <Bouton
          libelle={t('urgence.autresGardes')}
          variante="blanc"
          typo="bouton"
          hauteur={CIBLE_TACTILE}
          icone={<IconeLune size={20} color={c.pastilleActionIcone} plein />}
          onPress={() => allerOnglet('garde')}
          style={styles.autres}
          testID="urgence-autres-gardes"
        />
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: espacements.gouttiere, paddingBottom: 24 },
  bandeau: {
    marginHorizontal: -espacements.gouttiere,
    paddingHorizontal: espacements.gouttiere,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 4,
    borderBottomLeftRadius: rayons.surface,
    borderBottomRightRadius: rayons.surface,
  },
  bandeauChevauche: { paddingBottom: 20 + CHEVAUCHEMENT },
  chevauchement: { marginTop: -CHEVAUCHEMENT },
  etiquette: { marginTop: 20, marginBottom: 8, paddingHorizontal: 4 },
  autres: { marginTop: 12, alignSelf: 'center', paddingHorizontal: 18 },
});

export default avecErrorBoundary(Urgence, 'Urgence');
