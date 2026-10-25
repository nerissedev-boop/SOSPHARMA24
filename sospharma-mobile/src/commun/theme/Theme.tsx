import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { usePreferences } from '../lib/preferences';
import { estHeureDeNuit, fuseauAppareil } from '../lib/temps';
import { espacements, hauteurs } from './espacements';
import { jetonsJour, jetonsNuit, type Jetons } from './jetons';
import { variantes } from './typographie';

export type NomTheme = 'jour' | 'nuit';

export type Theme = {
  nom: NomTheme;
  estNuit: boolean;
  /** Vrai si le mode nuit vient de l'horaire (19:00–06:00), faux s'il est forcé. */
  automatique: boolean;
  couleurs: Jetons;
  espacements: typeof espacements;
  hauteurs: typeof hauteurs;
  typo: typeof variantes;
};

function construireTheme(nom: NomTheme, automatique: boolean): Theme {
  return {
    nom,
    estNuit: nom === 'nuit',
    automatique,
    couleurs: nom === 'nuit' ? jetonsNuit : jetonsJour,
    espacements,
    hauteurs,
    typo: variantes,
  };
}

const ContexteTheme = createContext<Theme>(construireTheme('jour', true));

/** Horloge partagée : se met à jour chaque minute. */
export function useMaintenant(intervalleMs = 60_000): Date {
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setMaintenant(new Date()), intervalleMs);
    return () => clearInterval(id);
  }, [intervalleMs]);
  return maintenant;
}

type Props = {
  children: ReactNode;
  /** Fuseau du pays (configuration de l'API) ; à défaut celui de l'appareil. */
  fuseau?: string | null;
  /** Force un thème (tests, aperçus). */
  forcer?: NomTheme;
};

export function FournisseurTheme({ children, fuseau, forcer }: Props) {
  const modeNuit = usePreferences((e) => e.modeNuit);
  const maintenant = useMaintenant();
  const theme = useMemo(() => {
    if (forcer) return construireTheme(forcer, false);
    if (modeNuit === 'jour') return construireTheme('jour', false);
    if (modeNuit === 'nuit') return construireTheme('nuit', false);
    const nuit = estHeureDeNuit(maintenant, fuseau ?? fuseauAppareil());
    return construireTheme(nuit ? 'nuit' : 'jour', true);
  }, [forcer, modeNuit, maintenant, fuseau]);
  return <ContexteTheme.Provider value={theme}>{children}</ContexteTheme.Provider>;
}

export function useTheme(): Theme {
  return useContext(ContexteTheme);
}
