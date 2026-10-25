import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PharmacieResume } from '@/commun/api';
import { dateCourte, distanceKm, distanceNombre, t, useEnLigne, usePreferences } from '@/commun/lib';
import { ombres, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  BarreZone,
  Bouton,
  BoutonIcone,
  ChampRecherche,
  DistanceMarche,
  Ecran,
  EnTete,
  Filtre,
  HiMedicalSearchOutline,
  HiPhone,
  IconeBulle,
  IconeCalques,
  IconeEtoile,
  IconeFermer,
  IconeFiltres,
  IconeItineraire,
  IconeLune,
  IconeViseur,
  LignePharmacie,
  PastilleStatut,
  Texte,
  useNavigationOnglets,
} from '@/commun/ui';
import {
  CarteBase,
  carteDisponible,
  MarqueurCommune,
  MarqueurPharmacie,
  PointPosition,
  Repere,
  type RefCarte,
  type VueCarte,
} from '@/commun/ui/carte';
import { useTourEnCours } from '@/modules/gardes';
import { useCompteurs, usePaysCourant, useVilles, useZoneCourante } from '@/modules/territoire';

import { AucunResultat } from '../composants/AucunResultat';
import { useActionsPharmacie } from '../hooks/useActions';
import { useLibelleStatut, usePharmacie, usePharmaciesCadre, usePharmaciesProches, useRecherche } from '../hooks/usePharmacies';

/** En dessous de ce zoom, la carte bascule sur les compteurs par commune (maquette 11). */
const ZOOM_COMMUNES = 12.5;

/** 04 Carte, 11 Carte dézoomée, 21 Carte nuit. */
function Carte() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const allerOnglet = useNavigationOnglets();
  const { couleurs: c, estNuit } = useTheme();
  const enLigne = useEnLigne();
  const refCarte = useRef<RefCarte>(null);
  const [vue, setVue] = useState<VueCarte | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [hauteurEnTete, setHauteurEnTete] = useState(180);
  const [hauteurFiche, setHauteurFiche] = useState(200);

  const filtreRapide = usePreferences((e) => e.filtreRapide);
  const definirFiltreRapide = usePreferences((e) => e.definirFiltreRapide);
  const paysCode = usePreferences((e) => e.paysCode);
  const { zone, point, villeId } = useZoneCourante();
  const { fuseau } = usePaysCourant();
  const villes = useVilles(paysCode);
  const ville = villes.data?.find((v) => v.id === villeId);
  const libelleStatut = useLibelleStatut();
  const actions = useActionsPharmacie();
  const { dateEnregistree } = useTourEnCours();

  const modeCommunes = vue !== null && vue.zoom < ZOOM_COMMUNES;
  const proches = usePharmaciesProches();
  const toutes = usePharmaciesProches({ rapide: 'toutes' });
  const cadre = usePharmaciesCadre(vue && !modeCommunes ? vue.bornes : null);
  const compteurs = useCompteurs(modeCommunes ? villeId : null);
  const resultats = useRecherche(recherche);

  const points = useMemo(() => cadre.liste ?? proches.liste ?? [], [cadre.liste, proches.liste]);
  const choisie = useMemo<PharmacieResume | undefined>(
    () => points.find((p) => p.id === selection) ?? proches.liste?.[0] ?? points[0],
    [points, selection, proches.liste],
  );
  const ficheChoisie = usePharmacie(choisie?.id ?? '', Boolean(choisie) && !modeCommunes);
  const noteChoisie = ficheChoisie.fiche?.id === choisie?.id ? ficheChoisie.fiche?.note : null;
  const communeResumee = compteurs.data?.find((x) => x.zone_id === zone?.zoneId) ?? compteurs.data?.[0];
  const sansCarte = !carteDisponible || !enLigne;

  const chipsOrdre = estNuit ? (['toutes', 'garde', 'ouvertes'] as const) : (['toutes', 'ouvertes', 'garde'] as const);
  const chips = (
    <View style={styles.filtres}>
      {chipsOrdre.map((cle) => {
        if (cle === 'toutes') {
          return (
            <Filtre
              key={cle}
              paddingHorizontal={12}
              libelle={!modeCommunes && !estNuit ? t('carte.toutesN', { count: toutes.nombre }) : t('accueil.toutes')}
              selectionne={filtreRapide === 'toutes'}
              onPress={() => definirFiltreRapide('toutes')}
            />
          );
        }
        if (cle === 'ouvertes') {
          return (
            <Filtre
              key={cle}
              paddingHorizontal={12}
              libelle={t('accueil.ouvertes')}
              point="vert"
              selectionne={filtreRapide === 'ouvertes'}
              onPress={() => definirFiltreRapide('ouvertes')}
            />
          );
        }
        return (
          <Filtre
            key={cle}
            paddingHorizontal={12}
            libelle={t('accueil.deGarde')}
            ton="garde"
            point={estNuit ? undefined : 'rouge'}
            icone={estNuit ? <IconeLune size={14} color={filtreRapide === 'garde' ? c.blanc : c.texte} plein /> : undefined}
            selectionne={filtreRapide === 'garde'}
            onPress={() => definirFiltreRapide('garde')}
          />
        );
      })}
    </View>
  );

  const enTete = (
    <View
      onLayout={(e) => setHauteurEnTete(e.nativeEvent.layout.height)}
      style={[
        styles.enTete,
        { backgroundColor: c.enTeteCarte, paddingTop: insets.top + 16, gap: modeCommunes ? 10 : 12 },
        !estNuit && ombres.enTete,
      ]}
    >
      <EnTete
        titre={t('carte.titre')}
        onRetour={() => allerOnglet('accueil')}
        logo={false}
        varianteTitre="titreBarre"
        droite={
          modeCommunes ? undefined : (
            <BarreZone variante="compacte" libelle={zone?.nom ?? t('commun.aucuneZone')} onChanger={() => router.push('/zone')} />
          )
        }
      />
      {modeCommunes ? (
        <BarreZone
          variante="bandeau"
          libelle={t('carte.toutesCommunes', { ville: ville?.nom ?? zone?.villeNom ?? '' })}
          onChanger={() => router.push('/zone')}
        />
      ) : !estNuit ? (
        <View style={styles.ligneRecherche}>
          <View style={styles.flex}>
            <ChampRecherche
              libelle={t('carte.rechercheA11y')}
              placeholder={t('carte.recherche')}
              value={saisie}
              onChangeText={(v) => {
                setSaisie(v);
                if (!v) setRecherche('');
              }}
              onSubmitEditing={() => setRecherche(saisie.trim())}
              rendreIcone={(couleur) => <HiMedicalSearchOutline size={22} color={couleur} />}
              testID="champ-recherche-pharmacie"
            />
          </View>
          {recherche ? (
            <BoutonIcone
              accessibilityLabel={t('commun.fermer')}
              fond={c.surface}
              taille={46}
              onPress={() => {
                setSaisie('');
                setRecherche('');
              }}
            >
              <IconeFermer size={20} color={c.texte} />
            </BoutonIcone>
          ) : (
            <BoutonIcone accessibilityLabel={t('carte.filtres')} fond={c.surface} taille={46} onPress={() => router.push('/filtres')} testID="bouton-filtres">
              <IconeFiltres size={20} color={c.texte} />
            </BoutonIcone>
          )}
        </View>
      ) : null}
      {chips}
    </View>
  );

  // Liste à la place de la carte (web ou hors connexion : pas de fonds de carte hors ligne en V1).
  if (sansCarte) {
    return (
      <Ecran hautSur={false} testID="ecran-carte">
        {enTete}
        <BandeauHorsConnexion dateGarde={dateEnregistree} />
        <ScrollView contentContainerStyle={styles.listeRemplacement}>
          <Texte variante="libelle" couleur={c.texteSecondaire}>
            {enLigne ? t('carte.nonDisponible') : t('carte.horsLigne')}
          </Texte>
          {(recherche ? (resultats.liste ?? []) : (proches.liste ?? [])).map((p) => (
            <LignePharmacie
              key={p.id}
              nom={p.nom}
              statut={p.statut}
              libelleStatut={libelleStatut(p)}
              distanceM={p.distance_m}
              marcheMin={p.marche_min}
              onPress={() => actions.ouvrir(p)}
              onAppeler={p.telephone ? () => actions.appeler(p) : undefined}
            />
          ))}
        </ScrollView>
      </Ecran>
    );
  }

  return (
    <Ecran hautSur={false} fond={c.carteFond} testID="ecran-carte">
      <CarteBase
        refCarte={refCarte}
        nuit={estNuit}
        centreInitial={point ?? { latitude: ville?.latitude ?? 5.33, longitude: ville?.longitude ?? -4.02 }}
        zoomInitial={14}
        onVueChange={setVue}
        marges={{ top: hauteurEnTete, bottom: hauteurFiche + 20 }}
      >
        {point ? (
          <Repere id="ma-position" coordonnees={point}>
            <PointPosition />
          </Repere>
        ) : null}
        {modeCommunes
          ? (compteurs.data ?? []).map((commune) => (
              <Repere
                key={commune.zone_id}
                id={commune.zone_id}
                coordonnees={commune}
                onPress={() => refCarte.current?.recentrer(commune, 14)}
              >
                <View
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={t('carte.commune', { nom: commune.nom, count: commune.nombre_pharmacies, gardes: commune.nombre_gardes })}
                >
                  <MarqueurCommune nombre={commune.nombre_pharmacies} gardes={commune.nombre_gardes} />
                </View>
              </Repere>
            ))
          : points.map((p) => {
              const choisi = p.id === choisie?.id;
              const libelle = t('carte.marqueur', { nom: p.nom, statut: libelleStatut(p), distance: distanceKm(p.distance_m) });
              return (
                <Repere key={p.id} id={p.id} coordonnees={p} ancre="left" onPress={() => setSelection(p.id)}>
                  <View accessible accessibilityRole="button" accessibilityLabel={choisi ? t('carte.selectionnee', { libelle }) : libelle}>
                    <MarqueurPharmacie
                      statut={p.statut}
                      selectionne={choisi}
                      etiquette={p.distance_m === null ? '' : choisi ? distanceKm(p.distance_m) : distanceNombre(p.distance_m)}
                    />
                  </View>
                </Repere>
              );
            })}
      </CarteBase>

      {enTete}

      <View style={[styles.boutonsCarte, { top: hauteurEnTete + 16 }]}>
        <BoutonIcone
          accessibilityLabel={t('carte.meLocaliser')}
          rond
          fond={c.feuille}
          style={ombres.boutonRond}
          onPress={() => point && refCarte.current?.recentrer(point, 14)}
        >
          <IconeViseur size={20} color={c.bleuPosition} />
        </BoutonIcone>
        <BoutonIcone
          accessibilityLabel={t('carte.calques')}
          rond
          fond={c.feuille}
          style={ombres.boutonRond}
          onPress={() =>
            modeCommunes
              ? point && refCarte.current?.recentrer(point, 14)
              : ville && refCarte.current?.recentrer({ latitude: ville.latitude, longitude: ville.longitude }, 11)
          }
        >
          <IconeCalques size={20} color={c.texte} />
        </BoutonIcone>
      </View>

      {recherche ? (
        <View style={[styles.resultats, { top: hauteurEnTete, backgroundColor: c.fond }]}>
          <ScrollView contentContainerStyle={styles.listeResultats} keyboardShouldPersistTaps="handled">
            {(resultats.liste ?? []).map((p) => (
              <LignePharmacie
                key={p.id}
                nom={p.nom}
                statut={p.statut}
                libelleStatut={libelleStatut(p)}
                distanceM={p.distance_m}
                marcheMin={p.marche_min}
                onPress={() => actions.ouvrir(p)}
                onAppeler={p.telephone ? () => actions.appeler(p) : undefined}
              />
            ))}
            {resultats.isSuccess && (resultats.liste ?? []).length === 0 ? (
              <AucunResultat onActualiser={() => void resultats.refetch()} />
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {!recherche ? (
        <View
          onLayout={(e) => setHauteurFiche(e.nativeEvent.layout.height)}
          style={[styles.fiche, { backgroundColor: c.feuille }, ombres.fiche]}
          testID="fiche-carte"
        >
          {modeCommunes ? (
            <>
              <View style={styles.legende}>
                <View style={styles.elementLegende}>
                  <View style={[styles.pointLegende, { backgroundColor: c.vert, borderRadius: 8 }]} />
                  <Texte variante="libelle" couleur={c.texteSecondaire}>
                    {t('carte.legendePharmacies')}
                  </Texte>
                </View>
                <View style={styles.elementLegende}>
                  <View style={[styles.pointLegende, { backgroundColor: c.rouge }]} />
                  <Texte variante="libelle" couleur={c.texteSecondaire}>
                    {t('carte.legendeGarde')}
                  </Texte>
                </View>
              </View>
              {communeResumee ? (
                <Texte variante="titreModal" titre style={styles.titreCommune}>
                  {t('carte.resumeCommune', {
                    commune: communeResumee.nom,
                    count: communeResumee.nombre_pharmacies,
                    gardes: communeResumee.nombre_gardes,
                  })}
                </Texte>
              ) : null}
              <Texte variante="petit" couleur={c.texteSecondaire}>
                {t('carte.zoomez')}
              </Texte>
              <Bouton libelle={t('carte.voirGardes')} icone="lune" hauteur={50} onPress={() => allerOnglet('garde')} />
            </>
          ) : choisie ? (
            estNuit ? (
              <>
                <View style={styles.ligneFiche}>
                  <View style={styles.textesFiche}>
                    <Texte variante="nomGrand" numberOfLines={1}>
                      {choisie.nom}
                    </Texte>
                    <Texte variante="petitFort" couleur={choisie.statut === 'garde' ? c.rougeTexte : choisie.statut === 'ouverte' ? c.vertTexte : c.texteTertiaire}>
                      {libelleStatut(choisie, 'carte')}
                    </Texte>
                    {choisie.garde?.confirmee_le ? (
                      <Texte variante="libelle" couleur={c.texteSecondaire}>
                        {t('statut.confirmeeLe', { date: dateCourte(choisie.garde.confirmee_le, fuseau) })}
                      </Texte>
                    ) : null}
                  </View>
                  <DistanceMarche distanceM={choisie.distance_m} marcheMin={choisie.marche_min} grande varianteDistance="distanceGrande" />
                </View>
                <View style={styles.actions2}>
                  <Bouton
                    libelle={t('commun.appeler')}
                    hauteur={50}
                    icone={<HiPhone size={18} color={c.blanc} />}
                    onPress={() => actions.appeler(choisie)}
                    style={styles.flex}
                  />
                  <Bouton
                    libelle={t('commun.itineraire')}
                    variante="blanc"
                    hauteur={50}
                    typo="bouton"
                    icone={<IconeItineraire size={16} color={c.pastilleActionIcone} />}
                    onPress={() => actions.itineraire(choisie)}
                    style={styles.flex}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.ligneFiche}>
                  <PastilleStatut statut={choisie.statut} taille={46} tailleIcone={choisie.statut === 'fermee' ? 28 : 30} />
                  <View style={styles.textesFiche}>
                    <Texte variante="nomGrand" numberOfLines={1}>
                      {choisie.nom}
                    </Texte>
                    <Texte variante="petitFort" couleur={choisie.statut === 'garde' ? c.rougeTexteFort : choisie.statut === 'ouverte' ? c.vertTexte : c.texteTertiaire}>
                      {libelleStatut(choisie)}
                    </Texte>
                    {noteChoisie ? <NoteAvis note={noteChoisie} /> : null}
                  </View>
                  <DistanceMarche distanceM={choisie.distance_m} marcheMin={choisie.marche_min} grande varianteDistance="distanceGrande" />
                </View>
                <View style={styles.actions3}>
                  <Bouton
                    libelle={t('commun.appeler')}
                    variante="clair"
                    hauteur={60}
                    empile
                    icone={<HiPhone size={18} color={c.pastilleActionIcone} />}
                    onPress={() => actions.appeler(choisie)}
                    style={styles.flex}
                  />
                  <Bouton
                    libelle={t('commun.itineraire')}
                    variante="clair"
                    hauteur={60}
                    empile
                    icone={<IconeItineraire size={16} color={c.pastilleActionIcone} />}
                    onPress={() => actions.itineraire(choisie)}
                    style={styles.flex}
                  />
                  <Bouton
                    libelle={t('commun.whatsapp')}
                    variante="clair"
                    hauteur={60}
                    empile
                    icone={<IconeBulle size={17} color={c.pastilleActionIcone} />}
                    onPress={() => actions.whatsapp(choisie)}
                    style={styles.flex}
                  />
                </View>
                <Bouton libelle={t('commun.voirDetails')} icone="voir" hauteur={50} onPress={() => actions.ouvrir(choisie)} testID="bouton-voir-details" />
              </>
            )
          ) : null}
        </View>
      ) : null}
    </Ecran>
  );
}

function NoteAvis({ note }: { note: { moyenne: number; nombre: number } }) {
  const { couleurs: c } = useTheme();
  return (
    <View style={styles.note}>
      <IconeEtoile size={14} color={c.etoile} />
      <Texte variante="libelle" couleur={c.texteSecondaire}>
        <Texte variante="libelleFort">{note.moyenne.toLocaleString('fr-FR')}</Texte> {t('carte.avis', { count: note.nombre })}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  enTete: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 20, paddingBottom: 12, zIndex: 2 },
  ligneRecherche: { flexDirection: 'row', gap: 10 },
  filtres: { flexDirection: 'row', gap: 8 },
  boutonsCarte: { position: 'absolute', right: 16, gap: 10 },
  resultats: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  listeResultats: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  listeRemplacement: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 4 },
  fiche: { position: 'absolute', left: 12, right: 12, bottom: 20, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 18, gap: 14 },
  ligneFiche: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textesFiche: { flex: 1, gap: 3, minWidth: 0 },
  actions3: { flexDirection: 'row', gap: 8 },
  actions2: { flexDirection: 'row', gap: 8 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legende: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  elementLegende: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointLegende: { width: 16, height: 16 },
  titreCommune: { fontSize: 18 },
});

export default avecErrorBoundary(Carte, 'Carte');
