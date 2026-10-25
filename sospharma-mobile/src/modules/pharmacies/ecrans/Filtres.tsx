import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  FILTRES_PAR_DEFAUT,
  t,
  usePreferences,
  useSelectionAssurances,
  type Filtres as TypeFiltres,
  type RayonKm,
} from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  CaseACocher,
  Ecran,
  EnTete,
  HiInsuranceCardOutline,
  HiPharmacy,
  IconeHorloge,
  PiedFixe,
  Texte,
  useRetour,
} from '@/commun/ui';

import { PucesAssurances } from '../composants/PucesAssurances';
import { useAssurances, useMesAssurances } from '../hooks/useAssurances';
import { usePharmaciesProches } from '../hooks/usePharmacies';

const RAYONS: RayonKm[] = [1, 2, 5];

function LigneCase({ icone, libelle, coche, onChange, hauteur = 52 }: { icone: ReactNode; libelle: string; coche: boolean; onChange: (v: boolean) => void; hauteur?: number }) {
  return (
    <Pressable onPress={() => onChange(!coche)} style={[styles.ligne, { minHeight: hauteur }]} accessible={false}>
      {icone}
      <Texte variante="corpsFort" style={styles.flex}>
        {libelle}
      </Texte>
      <CaseACocher coche={coche} onChange={onChange} libelle={libelle} />
    </Pressable>
  );
}

/** 13 Filtres (modal). Les choix ne s'appliquent qu'en validant. */
function Filtres() {
  const router = useRouter();
  const fermer = useRetour();
  const { couleurs: c } = useTheme();
  const filtres = usePreferences((e) => e.filtres);
  const assurancesChoisies = usePreferences((e) => e.assurancesFiltreChoisies);
  const definirFiltres = usePreferences((e) => e.definirFiltres);
  const definirFiltreRapide = usePreferences((e) => e.definirFiltreRapide);
  const { slugs: miennes } = useMesAssurances();
  const { data: referentiel } = useAssurances();
  // Assurances : tant que l'usager n'a pas validé de filtre d'assurance, on part de « Mes assurances ».
  const preRempli = !assurancesChoisies && filtres.assurances.length === 0 && miennes.length > 0;
  const [brouillon, setBrouillon] = useState<Omit<TypeFiltres, 'assurances'>>(filtres);
  const assurances = useSelectionAssurances((e) => e.selections.filtres);
  const definirAssurances = useSelectionAssurances((e) => e.definir);
  useEffect(() => {
    definirAssurances('filtres', preRempli ? miennes : filtres.assurances);
    // Sélection de départ déposée une seule fois, à l'ouverture du modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const complet = useMemo<TypeFiltres>(() => ({ ...brouillon, assurances }), [brouillon, assurances]);
  const apercu = usePharmaciesProches({ filtres: complet, rapide: 'toutes', limite: 50 });
  const maj = (partiel: Partial<TypeFiltres>) => setBrouillon((b) => ({ ...b, ...partiel }));
  const nomAssurance = (slug: string) => referentiel?.find((a) => a.slug === slug)?.nom ?? slug;
  const afficherPreRempli = miennes.length > 0 && assurances.length > 0 && assurances.every((a) => miennes.includes(a)) && assurances.length === miennes.length;

  const rond = (fond: string, enfant: ReactNode) => <View style={[styles.rond, { backgroundColor: fond }]}>{enfant}</View>;

  return (
    <Ecran testID="ecran-filtres">
      <ScrollView contentContainerStyle={styles.contenu}>
        <EnTete
          titre={t('filtres.titre')}
          icone="fermer"
          onRetour={fermer}
          droite={
            <Pressable
              onPress={() => {
                setBrouillon(FILTRES_PAR_DEFAUT);
                definirAssurances('filtres', []);
              }}
              accessibilityRole="button"
              style={styles.reinit}
            >
              <Texte variante="boutonPetit" couleur={c.vertTexte}>
                {t('filtres.reinitialiser')}
              </Texte>
            </Pressable>
          }
        />

        <View>
          <Texte variante="sectionMoyenne" titre style={styles.titre}>
            {t('filtres.statut')}
          </Texte>
          <LigneCase
            icone={rond(c.vert, <HiPharmacy size={22} color={c.blanc} />)}
            libelle={t('filtres.ouvertes')}
            coche={brouillon.ouvertes}
            onChange={(v) => maj({ ouvertes: v })}
          />
          <LigneCase
            icone={rond(c.rouge, <HiPharmacy size={22} color={c.blanc} />)}
            libelle={t('filtres.garde')}
            coche={brouillon.garde}
            onChange={(v) => maj({ garde: v })}
          />
          <LigneCase
            icone={rond(c.vertClair, <IconeHorloge size={18} color={c.vert} strokeWidth={2.2} />)}
            libelle={t('filtres.h24')}
            coche={brouillon.h24}
            onChange={(v) => maj({ h24: v })}
          />
        </View>

        <View style={styles.groupe}>
          <Texte variante="sectionMoyenne" titre>
            {t('filtres.distance')}
          </Texte>
          <View style={styles.rayons} accessibilityRole="radiogroup" accessibilityLabel={t('filtres.distance')}>
            {RAYONS.map((r) => {
              const actif = brouillon.rayonKm === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => maj({ rayonKm: r })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: actif }}
                  style={[styles.rayon, { backgroundColor: actif ? c.filtreSelection : c.filtreFond }]}
                >
                  <Texte variante="boutonPetit" couleur={actif ? c.filtreSelectionTexte : c.filtreTexte}>
                    {t('commun.km', { valeur: r })}
                  </Texte>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <View style={styles.titreAssurances}>
            <Texte variante="sectionMoyenne" titre>
              {t('filtres.assurances')}
            </Texte>
            <Texte variante="libelle" couleur={c.texteSecondaire}>
              {t('filtres.auMoinsUne')}
            </Texte>
          </View>
          <PucesAssurances
            puces={assurances.map((slug) => ({ cle: slug, libelle: nomAssurance(slug) }))}
            onRetirer={(slug) => definirAssurances('filtres', assurances.filter((a) => a !== slug))}
            action={{
              libelle: referentiel ? t('filtres.ajouterTotal', { total: referentiel.length }) : t('filtres.ajouter'),
              plus: true,
              onPress: () => router.push({ pathname: '/assurances', params: { contexte: 'filtres' } }),
              testID: 'bouton-ajouter-assurance',
            }}
          />
          {afficherPreRempli ? (
            <View style={styles.preRempli}>
              <HiInsuranceCardOutline size={18} color={c.texteSecondaire} />
              <Texte variante="libelle" couleur={c.texteSecondaire}>
                {t('filtres.preRempli')}
              </Texte>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <PiedFixe>
        <Bouton
          libelle={apercu.nombre > 0 ? t('filtres.voir', { count: apercu.nombre }) : t('filtres.voirZero')}
          icone="liste"
          hauteur={54}
          typo="boutonGrand"
          chargement={apercu.isFetching && !apercu.data}
          onPress={() => {
            definirFiltres(complet);
            definirFiltreRapide('toutes');
            fermer();
          }}
          testID="bouton-appliquer-filtres"
        />
      </PiedFixe>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 18 },
  reinit: { height: 44, justifyContent: 'center' },
  titre: { marginBottom: 4 },
  groupe: { gap: 10 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rond: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rayons: { flexDirection: 'row', gap: 6 },
  rayon: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  titreAssurances: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  preRempli: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default avecErrorBoundary(Filtres, 'Filtres');
