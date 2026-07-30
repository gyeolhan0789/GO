import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import type { Coords } from '../../../shared/lib/geolocation';

const REGION_DELTA = 0.004;

type WalkRouteMapProps = {
  route: Coords[];
};

export function WalkRouteMap({ route }: WalkRouteMapProps) {
  const current = route[route.length - 1];

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      // 자체 픽셀 마커로 현재 위치를 표시하므로 기본 파란 점은 끈다.
      showsUserLocation={false}
      followsUserLocation={false}
      region={
        current
          ? {
              latitude: current.latitude,
              longitude: current.longitude,
              latitudeDelta: REGION_DELTA,
              longitudeDelta: REGION_DELTA,
            }
          : undefined
      }
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
}

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
