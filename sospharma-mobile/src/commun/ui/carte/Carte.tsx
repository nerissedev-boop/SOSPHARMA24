import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as CarteMapLibre,
  Marker,
  type CameraRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, type NativeSyntheticEvent } from 'react-native';

import { styleCarte } from '../../theme/styleCarte';
import type { PropsCarteBase, PropsRepere, PropsTrace } from './types';

/**
 * Carte MapLibre (development build obligatoire : ne tourne pas dans Expo Go).
 * Les modules n'importent jamais MapLibre directement : ils passent par ce fichier,
 * remplacé sur le web par Carte.web.tsx.
 */
export const carteDisponible = true;

export function CarteBase({
  nuit,
  centreInitial,
  zoomInitial = 14,
  onVueChange,
  refCarte,
  children,
  style,
  marges,
  testID,
}: PropsCarteBase) {
  const camera = useRef<CameraRef>(null);
  const mapStyle = useMemo(() => styleCarte(nuit), [nuit]);

  useImperativeHandle(
    refCarte,
    () => ({
      recentrer: (centre, zoom) =>
        camera.current?.easeTo({ center: [centre.longitude, centre.latitude], zoom, duration: 600 }),
    }),
    [],
  );

  const surChangement = (e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const v = e.nativeEvent;
    onVueChange?.({
      centre: { longitude: v.center[0], latitude: v.center[1] },
      zoom: v.zoom,
      bornes: v.bounds,
    });
  };

  return (
    <CarteMapLibre
      testID={testID}
      style={[StyleSheet.absoluteFill, style]}
      mapStyle={mapStyle}
      logo={false}
      compass={false}
      attribution
      attributionPosition={{ bottom: (marges?.bottom ?? 0) + 4, left: 8 }}
      onRegionDidChange={surChangement}
      contentInset={marges ? { top: marges.top, bottom: marges.bottom, left: marges.left ?? 0, right: marges.right ?? 0 } : undefined}
    >
      <Camera
        ref={camera}
        initialViewState={{ center: [centreInitial.longitude, centreInitial.latitude], zoom: zoomInitial }}
      />
      {children}
    </CarteMapLibre>
  );
}

export function Repere({ id, coordonnees, onPress, children, ancre = 'center' }: PropsRepere) {
  return (
    <Marker id={id} lngLat={[coordonnees.longitude, coordonnees.latitude]} anchor={ancre} onPress={onPress}>
      {children}
    </Marker>
  );
}

export function Trace({ id, points, couleur, epaisseur = 6, contour }: PropsTrace) {
  const donnees = useMemo<GeoJSON.Feature>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: points.map((p) => [p.longitude, p.latitude]) },
    }),
    [points],
  );
  return (
    <GeoJSONSource id={`${id}-source`} data={donnees}>
      {contour ? (
        <Layer
          id={`${id}-contour`}
          type="line"
          style={{ lineColor: contour, lineWidth: epaisseur * 2, lineCap: 'round', lineJoin: 'round' }}
        />
      ) : null}
      <Layer id={id} type="line" style={{ lineColor: couleur, lineWidth: epaisseur, lineCap: 'round', lineJoin: 'round' }} />
    </GeoJSONSource>
  );
}
