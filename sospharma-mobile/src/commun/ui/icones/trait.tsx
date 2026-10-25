import type { ReactNode } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Icônes simples absentes de Healthicons, tracées au trait comme dans les maquettes
 * (viewBox 24, extrémités arrondies). Tracés repris tels quels des fichiers .dc.html.
 */
export type PropsIconeTrait = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  accessibilityLabel?: string;
};

function Base({
  size = 24,
  accessibilityLabel,
  children,
}: {
  size?: number;
  accessibilityLabel?: string;
  children: ReactNode;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {children}
    </Svg>
  );
}

const trait = (couleur: string, epaisseur: number) => ({
  fill: 'none',
  stroke: couleur,
  strokeWidth: epaisseur,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function IconeRetour({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M15 5l-7 7 7 7" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeFermer({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M6 6l12 12M18 6 6 18" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeRecherche({ color = '#6B7280', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Circle cx="11" cy="11" r="7" {...trait(color, strokeWidth)} />
      <Path d="m20 20-3.5-3.5" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeFiltres({ color = '#1A1A1A', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...trait(color, strokeWidth)} />
      <Circle cx="16" cy="7" r="2" {...trait(color, strokeWidth)} />
      <Circle cx="10" cy="17" r="2" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeLune({ color = '#1A1A1A', strokeWidth = 2, plein = false, ...p }: PropsIconeTrait & { plein?: boolean }) {
  const d = 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z';
  return <Base {...p}>{plein ? <Path d={d} fill={color} /> : <Path d={d} {...trait(color, strokeWidth)} />}</Base>;
}

export function IconeItineraire({ color = '#1B8A3E', ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M3 11 21 3l-8 18-2-8z" fill={color} />
    </Base>
  );
}

export function IconePartage({ color = '#1A1A1A', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Circle cx="18" cy="5" r="2.5" {...trait(color, strokeWidth)} />
      <Circle cx="6" cy="12" r="2.5" {...trait(color, strokeWidth)} />
      <Circle cx="18" cy="19" r="2.5" {...trait(color, strokeWidth)} />
      <Path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Bulle de discussion (WhatsApp, « Nous contacter »). */
export function IconeBulle({ color = '#1B8A3E', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeHorloge({ color = '#56645C', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Circle cx="12" cy="12" r="9" {...trait(color, strokeWidth)} />
      <Path d="M12 7v5l3 2" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeBouclier({ color = '#1B8A3E', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" {...trait(color, strokeWidth)} />
      <Path d="m9 12 2 2 4-4" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeCloche({ color = '#1A1A1A', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" {...trait(color, strokeWidth)} />
      <Path d="M10 21h4" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeCoeur({ color = '#D32F2F', strokeWidth = 2, plein = false, ...p }: PropsIconeTrait & { plein?: boolean }) {
  const d = 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z';
  return <Base {...p}>{plein ? <Path d={d} fill={color} /> : <Path d={d} {...trait(color, strokeWidth)} />}</Base>;
}

export function IconeCalques({ color = '#1A1A1A', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="m12 3 9 5-9 5-9-5z" {...trait(color, strokeWidth)} />
      <Path d="m3 13 9 5 9-5" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeViseur({ color = '#2563EB', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Circle cx="12" cy="12" r="4" {...trait(color, strokeWidth)} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeInverser({ color = '#1A1A1A', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeChevronDroite({ color = '#6B7280', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="m9 5 7 7-7 7" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeChevronBas({ color = '#1A1A1A', strokeWidth = 2.4, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="m6 9 6 6 6-6" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeCoche({ color = '#1B8A3E', strokeWidth = 2.6, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="m5 12 5 5 9-10" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeAppareilPhoto({ color = '#C9D3CD', strokeWidth = 1.6, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...trait(color, strokeWidth)} />
      <Circle cx="12" cy="13" r="3.5" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeEtoile({ color = '#F5A623', ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill={color} />
    </Base>
  );
}

export function IconeTelephoneTrait({ color = '#56645C', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconePlus({ color = '#FFFFFF', strokeWidth = 3, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M12 5v14M5 12h14" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeSms({ color = '#1B8A3E', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M4 5h16v11H9l-5 4z" {...trait(color, strokeWidth)} />
      <Path d="M8 10h8M8 13h5" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeCopier({ color = '#1B8A3E', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M9 9h11v11H9z" {...trait(color, strokeWidth)} />
      <Path d="M5 15H4V4h11v1" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconePoints({ color = '#1B8A3E', ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Circle cx="5" cy="12" r="2" fill={color} />
      <Circle cx="12" cy="12" r="2" fill={color} />
      <Circle cx="19" cy="12" r="2" fill={color} />
    </Base>
  );
}

export function IconeVoiture({ color = '#1B8A3E', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M5 16v-4l2-5h10l2 5v4M3 16h18v3H3zM5 12h14" {...trait(color, strokeWidth)} />
    </Base>
  );
}

export function IconeEnveloppe({ color = '#1B8A3E', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M3 6h18v12H3z" {...trait(color, strokeWidth)} />
      <Path d="m3 7 9 6 9-6" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Repère plein (en-tête rouge de l'écran Garde). */
export function IconeRepere({ color = '#FFFFFF', ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill={color} />
    </Base>
  );
}

// ----- Icônes des boutons d'action (charte, ajout du 21 oct.) : 20 px, couleur du texte -----

/** Avion en papier : envoyer. */
export function IconeEnvoyer({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M22 2 11 13" {...trait(color, strokeWidth)} />
      <Path d="M22 2 15 22l-4-9-9-4z" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Flèche de navigation au trait : y aller, démarrer. */
export function IconeNaviguer({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M3 11 21 3l-8 18-2-8z" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Œil : voir, afficher le mot de passe. */
export function IconeOeil({ color = '#1A1A1A', strokeWidth = 2.2, barre = false, ...p }: PropsIconeTrait & { barre?: boolean }) {
  return (
    <Base {...p}>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" {...trait(color, strokeWidth)} />
      <Circle cx="12" cy="12" r="3" {...trait(color, strokeWidth)} />
      {barre ? <Path d="M4 4l16 16" {...trait(color, strokeWidth)} /> : null}
    </Base>
  );
}

/** Liste : voir N pharmacies. */
export function IconeListe({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M8 6h13M8 12h13M8 18h13" {...trait(color, strokeWidth)} />
      <Path d="M3 6h.01M3 12h.01M3 18h.01" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Flèche circulaire : actualiser, mettre à jour, réessayer. */
export function IconeActualiser({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M21 12a9 9 0 1 1-3-6.7" {...trait(color, strokeWidth)} />
      <Path d="M21 4v5h-5" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Flèche → : continuer. */
export function IconeContinuer({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M5 12h14" {...trait(color, strokeWidth)} />
      <Path d="m13 6 6 6-6 6" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Carte dépliée : choisir manuellement. */
export function IconeCarteDepliee({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" {...trait(color, strokeWidth)} />
      <Path d="M9 4v14M15 6v14" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Repère au trait : choisir une autre zone. */
export function IconeLieu({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" {...trait(color, strokeWidth)} />
      <Circle cx="12" cy="9" r="2.5" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Porte et flèche : se connecter. */
export function IconeConnexion({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M10 17l5-5-5-5" {...trait(color, strokeWidth)} />
      <Path d="M15 12H3" {...trait(color, strokeWidth)} />
      <Path d="M14 4h6v16h-6" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Cadenas : champ mot de passe. */
export function IconeCadenas({ color = '#6B7280', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M5 11h14v10H5z" {...trait(color, strokeWidth)} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...trait(color, strokeWidth)} />
      <Path d="M12 15v2" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Presse-papiers coché : onglet « Relevés » de l'agent. */
export function IconeReleves({ color = '#1A1A1A', strokeWidth = 2.2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M9 4h6v3H9z" {...trait(color, strokeWidth)} />
      <Path d="M7 5H5v16h14V5h-2" {...trait(color, strokeWidth)} />
      <Path d="m9 14 2 2 4-4" {...trait(color, strokeWidth)} />
    </Base>
  );
}

/** Wi-Fi barré : relevés en attente d'envoi. */
export function IconeSansReseau({ color = '#9A5B00', strokeWidth = 2, ...p }: PropsIconeTrait) {
  return (
    <Base {...p}>
      <Path d="M2 8.8a15 15 0 0 1 20 0M5.5 12.3a10 10 0 0 1 13 0M9 15.8a5 5 0 0 1 6 0" {...trait(color, strokeWidth)} />
      <Path d="M3 3l18 18" {...trait(color, strokeWidth)} />
    </Base>
  );
}
