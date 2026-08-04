import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import type { Coords } from '../../../shared/lib/geolocation';

const REGION_DELTA = 0.004;

// 지도 전용 색 — 다크 미니맵의 물. 배경(ink)보다 살짝 밝은 어두운 청록이라
// shared 팔레트에 없어 여기서만 쓴다.
const MAP_WATER_COLOR = '#123A3D';

// 게임 미니맵처럼: 어두운 배경 위에 도로만 밝은 초록 라인으로 강조하고
// 라벨·경계선은 다 지운다.
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: colors.ink }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: colors.primary }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: MAP_WATER_COLOR }] },
];

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

    // initialRegion은 마운트 시점에만 적용되고 이후 갱신은 무시된다. 좌표를
    // 모르는 채로 먼저 마운트하면 지도가 기본 위치(적도 부근)로 떴다가 애니메이션
    // 으로 튀는 것처럼 보인다 — 좌표가 생기기 전엔 아예 지도를 마운트하지 않는다.
    if (!current) {
      return (
        <View style={[styles.map, styles.loading]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={MAP_STYLE}
        // 자체 픽셀 마커로 현재 위치를 표시하므로 기본 파란 점은 끈다.
        showsUserLocation={false}
        followsUserLocation={false}
        initialRegion={toRegion(current)}
      >
        {route.length > 1 ? (
          // 도로도 primary(초록)라 걸어온 경로는 눈에 띄는 노란색으로 대비를 준다.
          <Polyline
            coordinates={route}
            strokeColor={colors.highlightBg}
            strokeWidth={4}
            lineDashPattern={[10, 8]}
            lineCap="square"
            lineJoin="miter"
          />
        ) : null}

        <Marker coordinate={current} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.marker}>
            <View style={styles.markerDot} />
          </View>
        </Marker>
      </MapView>
    );
  },
);

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  loading: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    borderWidth: 2,
    // ink 배경 위에서도 보이도록 밝은 테두리로 바꿨다(원래 ink 테두리는
    // 다크 미니맵 배경에 묻혀 안 보임).
    borderColor: colors.surface,
    backgroundColor: colors.highlightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.ink,
  },
});
