// Fichier généré par scripts/generer-icones.mjs à partir de Healthicons (MIT, voir LICENSE-healthicons).
// Ne pas modifier à la main : relancez `npm run icones:generer`.
import Svg, { G, Path } from 'react-native-svg';

export type PropsIcone = {
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  testID?: string;
};

function props(p: PropsIcone) {
  return {
    width: p.size ?? 24,
    height: p.size ?? 24,
    viewBox: '0 0 48 48',
    testID: p.testID,
    accessible: Boolean(p.accessibilityLabel),
    accessibilityLabel: p.accessibilityLabel,
    accessibilityElementsHidden: !p.accessibilityLabel,
    importantForAccessibility: p.accessibilityLabel ? ('yes' as const) : ('no-hide-descendants' as const),
  };
}

/** Healthicons « pharmacy ». */
export function HiPharmacy({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M18.305 13c-.057-1.61-.011-3.315.556-4.647c.299-.7.73-1.266 1.354-1.667c.627-.402 1.527-.686 2.843-.686c1.475 0 2.704.536 3.584 1.094c.437.278.778.555 1.007.76a6 6 0 0 1 .31.3l.01.01v.001a1 1 0 0 0 1.496-1.328l-.735.65c.735-.65.733-.652.733-.652v-.001l-.004-.004l-.01-.01a3 3 0 0 0-.122-.13a8 8 0 0 0-.343-.325a10 10 0 0 0-1.27-.96C26.624 4.716 25.024 4 23.058 4c-1.606 0-2.903.349-3.923 1.003c-1.023.657-1.69 1.57-2.114 2.566c-.738 1.733-.774 3.798-.718 5.431H11c-.553 0-1.006.45-.943.998c.615 5.38 6.16 9.643 13.058 9.98V32h2v-8.034a17 17 0 0 0 4.87-1.02q.015.172.015.357c0 .762-.623 1.674-1.901 2.466a8.6 8.6 0 0 1-2.099.924v2.066a10.6 10.6 0 0 0 3.151-1.29C30.624 26.56 32 25.123 32 23.304c0-.41-.038-.815-.123-1.208c3.367-1.804 5.68-4.732 6.066-8.097c.063-.548-.391-.998-.943-.998z" /><Path d="M30 39c0 1.165-.36 2.188-1.019 3H32v2H16v-2h7.115v-4h2v3.914c.802-.131 1.436-.404 1.892-.763c.625-.49.993-1.196.993-2.151s-.368-1.66-.993-2.151c-.65-.512-1.662-.85-3.007-.85c-1.517 0-3.2-.119-4.531-.71c-.684-.304-1.315-.75-1.773-1.403c-.462-.66-.696-1.461-.696-2.386s.234-1.726.696-2.386c.458-.653 1.09-1.099 1.773-1.403c.76-.338 1.637-.522 2.531-.617v2.013c-.658.083-1.242.22-1.719.432c-.441.196-.747.438-.946.722c-.194.277-.335.664-.335 1.239s.14.962.335 1.239c.199.284.505.526.946.722c.92.409 2.236.539 3.719.539c1.654 0 3.144.413 4.243 1.276C29.368 36.16 30 37.455 30 39" /></G>
    </Svg>
  );
}

/** Healthicons « pharmacy-outline ». */
export function HiPharmacyOutline({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path fillRule="evenodd" d="M18.862 8.353c-.568 1.332-.614 3.037-.557 4.647H37c.552 0 1.006.45.943.998c-.385 3.365-2.699 6.293-6.066 8.097c.085.393.123.798.123 1.208c0 1.819-1.377 3.255-2.849 4.167A10.6 10.6 0 0 1 26 28.759v-2.067a8.6 8.6 0 0 0 2.099-.923C29.377 24.978 30 24.066 30 23.303q0-.185-.014-.356c-1.497.557-3.14.912-4.871 1.019V32h-2v-8.022c-6.898-.338-12.442-4.6-13.058-9.98c-.063-.548.39-.998.943-.998h5.304c-.057-1.633-.021-3.698.718-5.431c.424-.995 1.09-1.91 2.113-2.566C20.155 4.35 21.452 4 23.058 4c1.967 0 3.567.714 4.656 1.406c.547.347.975.695 1.27.959a8 8 0 0 1 .466.455l.01.01l.002.004l.002.001s0 .002-.734.653l.735-.651a1 1 0 0 1-1.495 1.328l-.01-.011l-.058-.06a6 6 0 0 0-.253-.24a8 8 0 0 0-1.007-.76C25.762 6.536 24.533 6 23.058 6c-1.316 0-2.215.284-2.843.686c-.624.4-1.055.967-1.353 1.667M12.306 15c1.175 3.76 5.667 7 11.694 7s10.52-3.24 11.694-7z" clipRule="evenodd" /><Path d="M16 42v2h16v-2h-3.019c.66-.812 1.019-1.835 1.019-3c0-1.545-.632-2.84-1.757-3.724C27.143 34.413 25.655 34 24 34c-1.483 0-2.8-.13-3.719-.539c-.441-.196-.747-.438-.946-.722c-.194-.277-.335-.664-.335-1.24c0-.574.14-.96.335-1.238c.199-.284.505-.526.946-.722c.477-.212 1.06-.35 1.719-.432v-2.014c-.894.096-1.77.28-2.531.618c-.684.304-1.315.75-1.773 1.403c-.462.66-.696 1.461-.696 2.386s.234 1.726.696 2.386c.458.653 1.09 1.099 1.773 1.403c1.33.591 3.014.71 4.531.71c1.346 0 2.356.338 3.007.85c.625.49.993 1.196.993 2.15c0 .956-.368 1.661-.993 2.152c-.457.359-1.09.632-1.892.763V38h-2v4z" /></G>
    </Svg>
  );
}

/** Healthicons « phone ». */
export function HiPhone({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <Path fill={color} d="M13.24 21.58c2.88 5.66 7.52 10.28 13.18 13.18l4.4-4.4c.54-.54 1.34-.72 2.04-.48c2.24.74 4.66 1.14 7.14 1.14c1.1 0 2 .9 2 2V40c0 1.1-.9 2-2 2C21.22 42 6 26.78 6 8c0-1.1.9-2 2-2h7c1.1 0 2 .9 2 2c0 2.5.4 4.9 1.14 7.14c.22.7.06 1.48-.5 2.04z" />
    </Svg>
  );
}

/** Healthicons « geo-location ». */
export function HiGeoLocation({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <Path fill={color} fillRule="evenodd" d="M23.424 41.817L24 41zm1.152 0l.004-.002l.01-.007l.03-.023l.118-.085q.152-.111.43-.324c.368-.282.89-.697 1.513-1.23a43.4 43.4 0 0 0 4.575-4.54C34.564 31.78 38 26.32 38 20.076c0-3.73-1.474-7.31-4.098-9.95A13.96 13.96 0 0 0 24 6a13.96 13.96 0 0 0-9.902 4.125A14.12 14.12 0 0 0 10 20.077c0 6.243 3.436 11.703 6.744 15.529a43.4 43.4 0 0 0 4.575 4.54c.624.533 1.145.948 1.513 1.23a26 26 0 0 0 .547.41l.032.022l.009.007l.004.002c.345.243.807.243 1.152 0M24 41l.576.817zm5-21a5 5 0 1 1-10 0a5 5 0 0 1 10 0" clipRule="evenodd" />
    </Svg>
  );
}

/** Healthicons « geo-location-outline ». */
export function HiGeoLocationOutline({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <Path fill={color} fillRule="evenodd" d="M15.517 11.535A11.96 11.96 0 0 1 24 8c3.18 0 6.232 1.27 8.483 3.535A12.12 12.12 0 0 1 36 20.077c0 5.526-3.064 10.528-6.256 14.221a41.4 41.4 0 0 1-4.363 4.328A36 36 0 0 1 24 39.752a37 37 0 0 1-1.381-1.126a41.4 41.4 0 0 1-4.363-4.328C15.064 30.605 12 25.603 12 20.077c0-3.205 1.266-6.277 3.517-8.542m7.907 30.282L24 41l.576.817a1 1 0 0 1-1.152 0m0 0L24 41l.576.817l.004-.002l.01-.007l.03-.023l.118-.085q.152-.111.43-.324c.368-.282.89-.697 1.513-1.23a43.4 43.4 0 0 0 4.575-4.54C34.564 31.78 38 26.32 38 20.076c0-3.73-1.474-7.31-4.098-9.95A13.96 13.96 0 0 0 24 6a13.96 13.96 0 0 0-9.902 4.125A14.12 14.12 0 0 0 10 20.077c0 6.243 3.436 11.703 6.744 15.529a43.4 43.4 0 0 0 4.575 4.54c.624.533 1.145.948 1.513 1.23a26 26 0 0 0 .547.41l.032.022l.009.007zM20 20a4 4 0 1 1 8 0a4 4 0 0 1-8 0m4-6a6 6 0 1 0 0 12a6 6 0 0 0 0-12" clipRule="evenodd" />
    </Svg>
  );
}

/** Healthicons « walking ». */
export function HiWalking({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M31.25 8a4 4 0 1 1-8 0a4 4 0 0 1 8 0m-5.557 20.397l5.193 5.124a2 2 0 0 1 .457.693l2.769 7.055a2 2 0 0 1-3.724 1.462l-2.614-6.661l-8.928-8.81a2 2 0 0 1-.583-1.649l.715-6.32c-1.724 1.714-3.054 4.123-4.073 7.316a2 2 0 1 1-3.81-1.216c1.87-5.86 4.975-10.246 10.185-12.257l.023-.009c1.327-.493 2.707-.453 3.937.182c1.181.611 2.022 1.666 2.573 2.848l.648 1.4c.488 1.058.898 1.95 1.293 2.732c.553 1.1.998 1.83 1.438 2.342c.408.474.813.766 1.33.968c.556.217 1.335.367 2.538.403a2 2 0 1 1-.12 3.998c-1.445-.043-2.728-.228-3.873-.675c-1.183-.462-2.116-1.165-2.91-2.09c-.5-.582-.94-1.247-1.35-1.97z" /><Path d="m18.263 30.22l3.315 3.18l-1.526 5.147a2 2 0 0 1-.684 1.006l-5.134 4.023a2 2 0 0 1-2.467-3.15l4.632-3.628l1.395-4.71z" /></G>
    </Svg>
  );
}

/** Healthicons « vespa-motorcycle ». */
export function HiVespaMotorcycle({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M29.004 13.674L25 12.97l.346-1.97l4.136.727A3.5 3.5 0 0 1 32.5 10h3.885c.34 0 .615.275.615.615v5.77c0 .34-.276.615-.615.615H32.5a3.5 3.5 0 0 1-3.496-3.326" /><Path fillRule="evenodd" d="M30.805 18.563L29.875 26H23v-1.28c0-.398-.378-.72-.844-.72h-8.07C8.516 24 4 27.85 4 32.6c0 .22.21.4.47.4h4.552a5.5 5.5 0 0 0 10.956 0h.91q.057 0 .112-.002V33h10.366c.202.68.783 1.115 1.418 1.25a5.5 5.5 0 0 0 10.703-2.137c.445-.464.669-1.145.395-1.882A6.5 6.5 0 0 0 35 26.628V19h-2.5a3.5 3.5 0 0 1-1.695-.437M16.95 33h-4.9a2.5 2.5 0 0 0 4.9 0m18.944.848a2.501 2.501 0 0 0 4.546-.801z" clipRule="evenodd" /><Path d="M9.17 20a3 3 0 0 1 .063-.162M9.17 20c-.11.313-.17.65-.17 1v1h15v-1q-.002-.507-.158-.962L23.83 20A3 3 0 0 0 21 18h-9a3 3 0 0 0-2.764 1.832" /></G>
    </Svg>
  );
}

/** Healthicons « home ». */
export function HiHome({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M24.507 10.138a1 1 0 0 0-1.014 0L5.631 20.645l1.014 1.724L24 12.16l17.355 10.21l1.014-1.724L36 16.9V12a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v1.957z" /><Path fillRule="evenodd" d="m24 14l-14 8v14H5a1 1 0 1 0 0 2h36a1 1 0 1 0 0-2h-3V22zm4 22V25h6v11zm-3-11H14v6h11z" clipRule="evenodd" /></G>
    </Svg>
  );
}

/** Healthicons « home-outline ». */
export function HiHomeOutline({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M24.507 10.138a1 1 0 0 0-1.014 0L5.631 20.645l1.014 1.724L24 12.16l17.355 10.21l1.014-1.724L36 16.9V12a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v1.957zM14 25h11v6H14z" /><Path fillRule="evenodd" d="m24 14l-14 8v14H5a1 1 0 1 0 0 2h36a1 1 0 1 0 0-2h-3V22zm0 2.303l-12 6.858V36h16V25h6v11h2V23.16z" clipRule="evenodd" /></G>
    </Svg>
  );
}

/** Healthicons « ui-user-profile ». */
export function HiUiUserProfile({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M32 20a8 8 0 1 1-16 0a8 8 0 0 1 16 0" /><Path fillRule="evenodd" d="M23.184 43.984C12.517 43.556 4 34.772 4 24C4 12.954 12.954 4 24 4s20 8.954 20 20s-8.954 20-20 20h-.274q-.272 0-.542-.016M11.166 36.62a3.028 3.028 0 0 1 2.523-4.005c7.796-.863 12.874-.785 20.632.018a2.99 2.99 0 0 1 2.498 4.002A17.94 17.94 0 0 0 42 24c0-9.941-8.059-18-18-18S6 14.059 6 24c0 4.916 1.971 9.373 5.166 12.621" clipRule="evenodd" /></G>
    </Svg>
  );
}

/** Healthicons « ui-user-profile-outline ». */
export function HiUiUserProfileOutline({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color} fillRule="evenodd" clipRule="evenodd"><Path d="M24 27a8 8 0 1 0 0-16a8 8 0 0 0 0 16m0-2a6 6 0 1 0 0-12a6 6 0 0 0 0 12" /><Path d="M44 24c0 11.046-8.954 20-20 20S4 35.046 4 24S12.954 4 24 4s20 8.954 20 20M33.63 39.21A17.9 17.9 0 0 1 24 42a17.9 17.9 0 0 1-9.831-2.92q-.36-.45-.73-.93A2.14 2.14 0 0 1 13 36.845c0-1.077.774-1.98 1.809-2.131c6.845-1 11.558-.914 18.412.035A2.08 2.08 0 0 1 35 36.818c0 .48-.165.946-.463 1.31q-.461.561-.907 1.082m3.355-2.744c-.16-1.872-1.581-3.434-3.49-3.698c-7.016-.971-11.92-1.064-18.975-.033c-1.92.28-3.335 1.856-3.503 3.733A17.94 17.94 0 0 1 6 24c0-9.941 8.059-18 18-18s18 8.059 18 18a17.94 17.94 0 0 1-5.015 12.466" /></G>
    </Svg>
  );
}

/** Healthicons « emergency-post ». */
export function HiEmergencyPost({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <Path fill={color} fillRule="evenodd" d="M43.935 32.649L38 18.962V10h-9v6h7v2H11.938c-1.348 0-2.536.869-2.924 2.138l-4.883 14C3.543 36.063 5.01 38 7.054 38H29.26c1.348 0 2.536-.869 2.923-2.138l4.803-13.733l4.607 10.249L34.5 34.5l-1 2.5l9.794-3.044l-.001-.004l.006-.002l.04-.014a.995.995 0 0 0 .596-1.287m-24.905-.891a1 1 0 1 0 1.94.485L21.78 29H25a1 1 0 1 0 0-2h-2.72l.69-2.757a1 1 0 1 0-1.94-.485L20.22 27H17a1 1 0 1 0 0 2h2.72z" clipRule="evenodd" />
    </Svg>
  );
}

/** Healthicons « ambulance ». */
export function HiAmbulance({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M32 12.5a1 1 0 1 0 2 0V11a1 1 0 1 0-2 0z" /><Path fillRule="evenodd" d="M4 16a2 2 0 0 1 2-2h22a2 2 0 0 1 1.732 1H30v4h1v-1h1v-1a1 1 0 1 1 2 0v1h1v1h.718a3 3 0 0 1 2.035.796l5.282 4.875A3 3 0 0 1 44 26.876V35h-5.126a4.002 4.002 0 0 1-7.748 0H15.874a4.002 4.002 0 0 1-7.748 0H4zm38 12H30v5h1.126a4.002 4.002 0 0 1 7.748 0H42zm-12-2h11.526l-5.13-4.735a1 1 0 0 0-.678-.265H30zM12 36a2 2 0 1 0 0-4a2 2 0 0 0 0 4m25-2a2 2 0 1 1-4 0a2 2 0 0 1 4 0M13 22h3v-3h2v3h3v2h-3v3h-2v-3h-3z" clipRule="evenodd" /><Path d="M36.5 17a1 1 0 0 1 1-1H39a1 1 0 1 1 0 2h-1.5a1 1 0 0 1-1-1m-.671-4.241a1 1 0 1 0 1.343 1.482l.914-.828a1 1 0 0 0-1.343-1.482z" /></G>
    </Svg>
  );
}

/** Healthicons « accident-and-emergency ». */
export function HiAccidentAndEmergency({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M20.862 19.532a1 1 0 0 1 .868 1.116l-.904 7.238a1 1 0 0 1-1.985-.248l.905-7.238a1 1 0 0 1 1.116-.868" /><Path fillRule="evenodd" d="M9 6a3 3 0 0 0-3 3v30a3 3 0 0 0 3 3h30a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3zm8.454 13.662c.195-1.656 1.392-3.048 3.035-3.332c2.55-.44 4.59-.437 7.041-.008c1.635.286 2.82 1.675 3.015 3.323L32 32H16zM15 36v-2h18v2zm-1.955-11a11 11 0 0 1 0-2H10v2zm.966-5.613a11 11 0 0 1 1.001-1.73l-2.636-1.523l-1 1.732zm3.645-4.375c.543-.383 1.122-.72 1.732-1.001l-1.522-2.635l-1.732 1zM23 13.045a11 11 0 0 1 2 0V10h-2zm5.613.966q.915.425 1.73 1.001l1.523-2.636l-1.732-1zm4.375 3.645c.383.543.72 1.122 1.001 1.732l2.635-1.522l-1-1.732zM34.955 23a11 11 0 0 1 0 2H38v-2z" clipRule="evenodd" /></G>
    </Svg>
  );
}

/** Healthicons « medical-search-outline ». */
export function HiMedicalSearchOutline({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color} fillRule="evenodd" clipRule="evenodd"><Path d="M24 24h-4v-6h4v-4h6v4h4v6h-4v4h-6zm-2-2v-2h4v-4h2v4h4v2h-4v4h-2v-4z" /><Path d="M27 36c8.284 0 15-6.716 15-15S35.284 6 27 6s-15 6.716-15 15c0 3.782 1.4 7.238 3.71 9.876l-1.893 1.893l-2.707-.121l-6.524 6.524l4.242 4.242l6.472-6.471l-.004-2.825l1.828-1.828A14.94 14.94 0 0 0 27 36m0-2c7.18 0 13-5.82 13-13S34.18 8 27 8s-13 5.82-13 13s5.82 13 13 13M8.828 40.586l-1.414-1.414l4.486-4.487l1.397.063l.002 1.367z" /></G>
    </Svg>
  );
}

/** Healthicons « prescription-document-outline ». */
export function HiPrescriptionDocumentOutline({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <Path fill={color} fillRule="evenodd" d="M10 4a1 1 0 0 0-1 1v38a1 1 0 0 0 1 1h28a1 1 0 0 0 1-1V15a1 1 0 0 0-.293-.707l-10-10A1 1 0 0 0 28 4zm1 38V6h16v9a1 1 0 0 0 1 1h9v26zm24.586-28L29 7.414V14zM17 33h2v-7h1.586l5 5l-3.293 3.293l1.414 1.414L27 32.414l3.293 3.293l1.414-1.414L28.414 31l3.293-3.293l-1.414-1.414L27 29.586l-3.605-3.605A4 4 0 0 0 23 18h-5a1 1 0 0 0-1 1zm6-9h-4v-4h4a2 2 0 1 1 0 4" clipRule="evenodd" />
    </Svg>
  );
}

/** Healthicons « insurance-card-outline ». */
export function HiInsuranceCardOutline({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M24 23H10v-2h14zm-14-4h14v-2H10zm14 8H10v-2h14zm-14 4h14v-2H10zm18-3.56a2 2 0 0 1 2.392-1.962l2.216.444a2 2 0 0 0 .784 0l2.216-.444A2 2 0 0 1 38 27.44V32H28zM33 24a4 4 0 1 0 0-8a4 4 0 0 0 0 8" /><Path fillRule="evenodd" d="M7 10a3 3 0 0 0-3 3v22a3 3 0 0 0 3 3h34a3 3 0 0 0 3-3V13a3 3 0 0 0-3-3zm34 2H7a1 1 0 0 0-1 1v22a1 1 0 0 0 1 1h34a1 1 0 0 0 1-1V13a1 1 0 0 0-1-1" clipRule="evenodd" /></G>
    </Svg>
  );
}

/** Healthicons « medicines-outline ». */
export function HiMedicinesOutline({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M37.084 15.735a1 1 0 1 0 .448-1.949l-6.616-1.52a1 1 0 1 0-.448 1.948z" /><Path fillRule="evenodd" d="M34 22a8 8 0 1 0 0-16a8 8 0 0 0 0 16m0-2a6 6 0 1 0 0-12a6 6 0 0 0 0 12M16.778 9.245c-.647-1.532-2.813-1.686-3.682-.263L6.292 20.115c-.785 1.284.092 2.924 1.623 3.033l11.866.846c1.53.11 2.644-1.388 2.06-2.77zm-1.967.768l-.009.012L8.01 21.14l.002.002l.01.004a.1.1 0 0 0 .036.007l11.867.846h.038a.1.1 0 0 0 .029-.015l-5.056-11.96l-.004-.01a.1.1 0 0 0-.054-.014a.13.13 0 0 0-.062.009l-.003.001v.001zM35.385 36.36a6 6 0 0 0-5.071-10.876l-10.876 5.07a6 6 0 1 0 5.071 10.877zm-15.102-3.992a4 4 0 1 0 3.381 7.25l4.466-2.083l-3.38-7.25zm9.66 4.322l-3.381-7.25l4.597-2.144a4 4 0 1 1 3.38 7.25z" clipRule="evenodd" /></G>
    </Svg>
  );
}

/** Healthicons « medicine-mortar ». */
export function HiMedicineMortar({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M38.014 7.265a3 3 0 0 0-4.02.97L27.685 18h8.248l3.42-6.671a3 3 0 0 0-1.17-3.967z" /><Path fillRule="evenodd" d="M43 22h-2v3c0 5.784-3.778 10.686-9 12.373V41a1 1 0 0 1-1 1H17a1 1 0 0 1-1-1v-3.627C10.778 35.686 7 30.784 7 25v-3H5v-2h38zM18 38v2h12v-2z" clipRule="evenodd" /></G>
    </Svg>
  );
}

/** Healthicons « hospital-symbol ». */
export function HiHospitalSymbol({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <Path fill={color} fillRule="evenodd" d="M23.964 3.98C12.918 3.99 3.97 12.951 3.98 23.997s8.97 19.992 20.017 19.983c11.045-.009 19.992-8.97 19.983-20.016S35.01 3.971 23.964 3.98M19.99 33.048v-7h8v7h4v-18h-4v7h-8v-7h-4v18z" clipRule="evenodd" />
    </Svg>
  );
}

/** Healthicons « star-small ». */
export function HiStarSmall({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      <G fill={color}><Path d="M23.083 14.568a1.025 1.025 0 0 1 1.834 0l2.452 4.951c.15.3.438.51.77.558l5.484.793a1.018 1.018 0 0 1 .567 1.739l-3.968 3.854a1.02 1.02 0 0 0-.294.902l.937 5.441c.143.833-.734 1.468-1.484 1.075l-4.905-2.57a1.03 1.03 0 0 0-.952 0l-4.905 2.57c-.75.393-1.627-.242-1.484-1.075l.937-5.441a1.02 1.02 0 0 0-.294-.902l-3.968-3.854a1.018 1.018 0 0 1 .567-1.739l5.483-.794c.334-.048.622-.256.77-.557z" /><Path fillRule="evenodd" d="m24 17.222l-1.577 3.185l-1.792-.888l2.452-4.95a1.025 1.025 0 0 1 1.834 0l2.452 4.95l-1.792.888zm6.222 9.24a1.02 1.02 0 0 0-.294.903l.937 5.441c.143.833-.734 1.468-1.484 1.075l-4.905-2.57a1.03 1.03 0 0 0-.952 0l-4.905 2.57c-.75.393-1.627-.242-1.484-1.075l.937-5.441a1.02 1.02 0 0 0-.294-.902l-3.968-3.854a1.018 1.018 0 0 1 .567-1.739l5.483-.794c.334-.048.622-.256.77-.557l1.793.888a3.02 3.02 0 0 1-2.276 1.649l-3.512.508l2.536 2.464l-1.31 1.349l1.31-1.35a3.02 3.02 0 0 1 .872 2.677l-.6 3.488l3.153-1.652a3.03 3.03 0 0 1 2.808 0l3.153 1.652l-.6-3.488a3.02 3.02 0 0 1 .872-2.676zm1.143-3.898l-3.512-.508a3.02 3.02 0 0 1-2.276-1.65l1.792-.887c.15.3.438.51.77.558l5.484.793a1.018 1.018 0 0 1 .567 1.739l-3.968 3.854l-1.393-1.435z" clipRule="evenodd" /></G>
    </Svg>
  );
}

export const healthicons = {
  'pharmacy': HiPharmacy,
  'pharmacy-outline': HiPharmacyOutline,
  'phone': HiPhone,
  'geo-location': HiGeoLocation,
  'geo-location-outline': HiGeoLocationOutline,
  'walking': HiWalking,
  'vespa-motorcycle': HiVespaMotorcycle,
  'home': HiHome,
  'home-outline': HiHomeOutline,
  'ui-user-profile': HiUiUserProfile,
  'ui-user-profile-outline': HiUiUserProfileOutline,
  'emergency-post': HiEmergencyPost,
  'ambulance': HiAmbulance,
  'accident-and-emergency': HiAccidentAndEmergency,
  'medical-search-outline': HiMedicalSearchOutline,
  'prescription-document-outline': HiPrescriptionDocumentOutline,
  'insurance-card-outline': HiInsuranceCardOutline,
  'medicines-outline': HiMedicinesOutline,
  'medicine-mortar': HiMedicineMortar,
  'hospital-symbol': HiHospitalSymbol,
  'star-small': HiStarSmall,
} as const;

export type NomHealthicon = keyof typeof healthicons;
