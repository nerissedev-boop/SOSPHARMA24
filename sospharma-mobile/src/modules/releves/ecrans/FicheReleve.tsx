import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { NouveauReleve } from '@/commun/api';
import { alerte, t, useSelectionAssurances, useSessionAgent } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  CaseACocher,
  ChampSaisie,
  Ecran,
  HiGeoLocation,
  HiInsuranceCardOutline,
  IconeChevronDroite,
  IconeHorloge,
  PiedFixe,
  Texte,
  useRetour,
} from '@/commun/ui';
import { PucesAssurances, useAssurances } from '@/modules/pharmacies';
import { usePaysCourant } from '@/modules/territoire';

import { useBrouillonReleve } from '../brouillon';
import { EditeurHoraires } from '../composants/EditeurHoraires';
import { EnTeteReleve } from '../composants/EnTeteReleve';
import { mettreEnFile } from '../file';
import { useEnvoyerFile } from '../hooks/useEnvoi';
import { resumeHoraires } from '../horaires';
import { numeroInternational } from '../propositions/telephone';

/** 27 Relevé, étape 4 : informations de la pharmacie, puis envoi (ou mise en file sans réseau). */
function FicheReleve() {
  const router = useRouter();
  const retour = useRetour();
  const { couleurs: c } = useTheme();
  const brouillon = useBrouillonReleve();
  const { champs, modifierChamps } = brouillon;
  const assurances = useSelectionAssurances((e) => e.selections.releve);
  const proposees = useSelectionAssurances((e) => e.proposees.releve);
  const { data: referentiel } = useAssurances();
  const { pays } = usePaysCourant();
  const envoyer = useEnvoyerFile();
  const marquerActivite = useSessionAgent((e) => e.marquerActivite);
  const [horairesOuverts, setHorairesOuverts] = useState(false);

  const nomAssurance = (slug: string) => referentiel?.find((a) => a.slug === slug)?.nom ?? slug;
  const puces = [
    ...assurances.map((slug) => ({ cle: slug, libelle: nomAssurance(slug) })),
    ...proposees.map((nom) => ({ cle: `libre-${nom}`, libelle: t('releve.proposee', { nom }) })),
  ];
  const nombrePhotos = Object.values(brouillon.photos).filter(Boolean).length;
  const resume = [
    brouillon.zone?.nom,
    brouillon.position ? t('releve.precisionCourte', { precision: brouillon.position.precision_m }) : null,
    t('releve.nombrePhotos', { count: nombrePhotos }),
  ]
    .filter(Boolean)
    .join(', ');

  const envoyerReleve = () => {
    if (champs.nom.trim().length < 2) return alerte(t('releve.titre'), t('releve.nomObligatoire'));
    if (brouillon.type === 'creation' && champs.adresse.trim().length < 2) return alerte(t('releve.titre'), t('releve.adresseObligatoire'));
    if (!brouillon.position) return alerte(t('releve.titre'), t('releve.positionManquante'));
    if (!brouillon.photos.facade) return alerte(t('releve.titre'), t('releve.facadeObligatoire'));
    const releve: NouveauReleve = {
      id: brouillon.id,
      type: brouillon.type,
      pharmacie_id: brouillon.pharmacieId,
      latitude: Number(brouillon.position.latitude.toFixed(6)),
      longitude: Number(brouillon.position.longitude.toFixed(6)),
      precision_m: brouillon.position.precision_m,
      ajustement_m: brouillon.position.ajustement_m,
      zone_id: brouillon.zone?.id ?? null,
      champs: {
        nom: champs.nom.trim(),
        adresse: champs.adresse.trim(),
        // Format international attendu par l'API (+2250102030405).
        telephone: numeroInternational(champs.telephone, pays?.indicatif),
        // « Même numéro » si le champ WhatsApp est laissé vide.
        whatsapp: numeroInternational(champs.whatsapp || champs.telephone, pays?.indicatif),
        horaires: champs.h24 ? [] : champs.horaires,
        h24: champs.h24,
        services: champs.services,
        // L'API attend les identifiants du référentiel (as_…) ; une assurance introuvable part en proposition libre.
        assurances: assurances.map((slug) => referentiel?.find((a) => a.slug === slug)?.id).filter((id): id is string => Boolean(id)),
        assurances_proposees: [...proposees, ...assurances.filter((slug) => !referentiel?.some((a) => a.slug === slug)).map(nomAssurance)],
      },
      releve_le: new Date().toISOString(),
    };
    mettreEnFile(releve, brouillon.photos, brouillon.zone?.nom ?? null);
    marquerActivite();
    brouillon.demarrer(null);
    void envoyer();
    if (router.canDismiss()) router.dismissTo('/releves');
    else router.replace('/releves');
  };

  return (
    <Ecran testID="ecran-releve-fiche">
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          <EnTeteReleve etape={4} titre={t(brouillon.type === 'mise_a_jour' ? 'releve.titreMiseAJour' : 'releve.titre')} onRetour={retour} />
          <Texte variante="titre" titre style={styles.titre}>
            {t('releve.informations')}
          </Texte>

          <ChampSaisie
            libelle={t('releve.nom')}
            varianteLibelle="petitFort"
            icone="pharmacie"
            hauteur={48}
            value={champs.nom}
            onChangeText={(nom) => modifierChamps({ nom })}
            autoCapitalize="words"
            testID="champ-nom-pharmacie"
          />
          <ChampSaisie
            libelle={t('releve.adresse')}
            varianteLibelle="petitFort"
            icone="lieu"
            hauteur={48}
            placeholder={t('releve.adressePlaceholder')}
            value={champs.adresse}
            onChangeText={(adresse) => modifierChamps({ adresse })}
            maxLength={255}
            testID="champ-adresse-pharmacie"
          />
          <View style={styles.deux}>
            <View style={styles.moitie}>
              <ChampSaisie
                libelle={t('releve.telephone')}
                varianteLibelle="petitFort"
                icone="telephone"
                tailleIcone={18}
                hauteur={48}
                taillePolice={13}
                keyboardType="phone-pad"
                value={champs.telephone}
                onChangeText={(telephone) => modifierChamps({ telephone })}
                testID="champ-telephone"
              />
            </View>
            <View style={styles.moitie}>
              <ChampSaisie
                libelle={t('releve.whatsapp')}
                varianteLibelle="petitFort"
                icone="whatsapp"
                tailleIcone={18}
                hauteur={48}
                taillePolice={13}
                keyboardType="phone-pad"
                placeholder={t('releve.memeNumero')}
                value={champs.whatsapp}
                onChangeText={(whatsapp) => modifierChamps({ whatsapp })}
                testID="champ-whatsapp"
              />
            </View>
          </View>

          <Pressable
            onPress={() => setHorairesOuverts(true)}
            disabled={champs.h24}
            accessibilityRole="button"
            accessibilityLabel={`${t('releve.horaires')}, ${resumeHoraires(champs.horaires, champs.h24)}`}
            style={[styles.horaires, { backgroundColor: c.surface, opacity: champs.h24 ? 0.6 : 1 }]}
            testID="ligne-horaires"
          >
            <IconeHorloge size={22} color={c.vert} />
            <View style={styles.textes}>
              <Texte variante="petitFort" style={styles.gras}>
                {t('releve.horaires')}
              </Texte>
              <Texte variante="petit" couleur={c.texteSecondaire}>
                {resumeHoraires(champs.horaires, champs.h24)}
              </Texte>
            </View>
            <IconeChevronDroite size={16} color={c.texteTertiaire} />
          </Pressable>

          <Pressable onPress={() => modifierChamps({ h24: !champs.h24 })} accessible={false} style={styles.h24}>
            <Texte variante="corpsFort" style={styles.flex}>
              {t('releve.h24')}
            </Texte>
            <CaseACocher coche={champs.h24} onChange={(h24) => modifierChamps({ h24 })} libelle={t('releve.h24')} testID="case-h24" />
          </Pressable>

          <View style={styles.assurances}>
            <View style={styles.titreAssurances}>
              <HiInsuranceCardOutline size={20} color={c.texte} />
              <Texte variante="petitFort" style={styles.gras}>
                {t('releve.assurances', { count: puces.length })}
              </Texte>
            </View>
            <PucesAssurances
              hauteur={36}
              puces={puces}
              action={{
                libelle: puces.length ? t('releve.modifier') : t('releve.ajouterAssurances'),
                plus: puces.length === 0,
                onPress: () => router.push({ pathname: '/assurances', params: { contexte: 'releve' } }),
                testID: 'bouton-modifier-assurances',
              }}
            />
          </View>

          <View style={[styles.resume, { backgroundColor: c.vertClair }]}>
            <HiGeoLocation size={20} color={c.vert} />
            <Texte variante="petit" couleur={c.vertTexte} style={styles.flex}>
              {resume}
            </Texte>
          </View>
        </ScrollView>
        <PiedFixe style={styles.pied}>
          <Bouton
            libelle={t('releve.envoyer')}
            icone="envoyer"
            hauteur={54}
            typo="boutonGrand"
            onPress={envoyerReleve}
            testID="bouton-envoyer-releve"
          />
          <Texte variante="libelle" couleur={c.texteSecondaire} aligne="center">
            {t('releve.envoiPlusTard')}
          </Texte>
        </PiedFixe>
      </KeyboardAvoidingView>
      <EditeurHoraires
        visible={horairesOuverts}
        horaires={champs.horaires}
        onFermer={() => setHorairesOuverts(false)}
        onValider={(horaires) => {
          modifierChamps({ horaires });
          setHorairesOuverts(false);
        }}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  titre: { marginTop: 6 },
  deux: { flexDirection: 'row', gap: 8 },
  moitie: { flex: 1 },
  horaires: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
  textes: { flex: 1, gap: 2 },
  gras: { fontFamily: 'PlusJakartaSans_700Bold' },
  h24: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  assurances: { gap: 8 },
  titreAssurances: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  pied: { gap: 8 },
});

export default avecErrorBoundary(FicheReleve, 'ReleveFiche');
