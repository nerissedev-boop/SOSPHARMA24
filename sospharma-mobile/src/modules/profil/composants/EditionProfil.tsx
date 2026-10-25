import { useState } from 'react';

import { t, type ProfilLocal } from '@/commun/lib';
import { Bouton, ChampSaisie, Feuille, type IconeChamp } from '@/commun/ui';

type Props = {
  visible: boolean;
  profil: ProfilLocal;
  onFermer: () => void;
  onEnregistrer: (p: ProfilLocal) => void;
};

/** Édition du profil local (prénom, nom, téléphone) : reste sur le téléphone. */
export function EditionProfil({ visible, profil, onFermer, onEnregistrer }: Props) {
  const [brouillon, setBrouillon] = useState(profil);
  // À chaque ouverture, le brouillon repart du profil enregistré.
  const [etaitVisible, setEtaitVisible] = useState(visible);
  if (visible !== etaitVisible) {
    setEtaitVisible(visible);
    if (visible) setBrouillon(profil);
  }
  const champ = (cle: keyof ProfilLocal, libelle: string, icone: IconeChamp, clavier: 'default' | 'phone-pad' = 'default') => (
    <ChampSaisie
      libelle={libelle}
      icone={icone}
      hauteur={48}
      value={brouillon[cle]}
      onChangeText={(v) => setBrouillon((b) => ({ ...b, [cle]: v }))}
      keyboardType={clavier}
      testID={`champ-profil-${cle}`}
    />
  );
  return (
    <Feuille
      visible={visible}
      onFermer={onFermer}
      titre={t('profil.editerTitre')}
      message={t('profil.localSeulement')}
      defilement
      pied={
        <>
          <Bouton libelle={t('profil.enregistrer')} icone="valider" onPress={() => onEnregistrer(brouillon)} />
          <Bouton libelle={t('commun.annuler')} icone="annuler" variante="secondaire" onPress={onFermer} />
        </>
      }
    >
      {champ('prenom', t('profil.prenom'), 'profil')}
      {champ('nom', t('profil.nom'), 'profil')}
      {champ('telephone', t('profil.telephone'), 'telephone', 'phone-pad')}
    </Feuille>
  );
}
