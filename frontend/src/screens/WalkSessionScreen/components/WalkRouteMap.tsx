import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import type { Coords } from '../../../shared/lib/geolocation';

const REGION_DELTA = 0.004;

type WalkRouteMapProps = {
  route: Coords[];
  // watchPosition의 첫 고정밀 좌표가 오기 전, 지도 초기 중심으로만 쓰는
  // 대략적인 위치. route에 아직 실측 좌표가 없을 때의 대체값이다.
  initialCoords: Coords | null;
};

export type WalkRouteMapHandle = {
  recenter: () => void;
};

function toRegion(coords: Coords): Region {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: REGION_DELTA,
    longitudeDelta: REGION_DELTA,
  };
}

export const WalkRouteMap = forwardRef<WalkRouteMapHandle, WalkRouteMapProps>(
  function WalkRouteMapComponent({ route, initialCoords }, ref) {
    const current = route[route.length - 1] ?? initialCoords ?? undefined;
    const mapRef = useRef<MapView>(null);
    // 위치가 갱신될 때마다 region을 다시 넘기면 사용자가 지도를 둘러보다가도
    // 몇 초마다 현재 위치로 강제로 끌려온다. 최초 좌표를 잡을 때만 자동으로
    // 중심을 맞추고, 이후에는 recenter 버튼을 눌렀을 때만 이동시킨다.
    const hasCenteredOnce = useRef(false);

    useEffect(() => {
      if (!current || hasCenteredOnce.current) {
        return;
      }
      hasCenteredOnce.current = true;
      mapRef.current?.animateToRegion(toRegion(current));
    }, [current]);

    useImperativeHandle(
      ref,
      () => ({
        recenter: () => {
          if (current) {
            mapRef.current?.animateToRegion(toRegion(current));
          }
        },
      }),
      [current],
    );

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        // 자체 픽셀 마커로 현재 위치를 표시하므로 기본 파란 점은 끈다.
        showsUserLocation={false}
        followsUserLocation={false}
        initialRegion={current ? toRegion(current) : undefined}
      >
        {route.length > 1 ? (
          <Polyline
            coordinates={route}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[10, 8]}
            lineCap="square"
            lineJoin="miter"
          />
        ) : null}

        {current ? (
          <Marker coordinate={current} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.marker}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    );
  },
);

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.surface,
  },
});
