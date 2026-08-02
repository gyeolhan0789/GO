import { useEffect, useRef, useState } from 'react';
import Geolocation, {
  type GeolocationResponse,
} from '@react-native-community/geolocation';

import { getCurrentCoords, type Coords } from '../../../shared/lib/geolocation';

// 걷는 동안에는 5m 이상 움직였을 때만, 최소 5초 간격으로 좌표를 찍는다.
// 너무 촘촘히 찍으면 배터리도 많이 쓰고 폴리라인도 지그재그로 떨린다.
const DISTANCE_FILTER_METERS = 5;
const UPDATE_INTERVAL_MS = 5000;

// 고층 건물 등에서 GPS 신호가 벽에 반사되면(멀티패스) 정확도가 크게 떨어진
// 좌표가 섞여 들어와 경로가 순간이동하듯 튄다. 두 겹으로 걸러낸다.
// 1) 기기가 스스로 밝힌 오차 반경이 이 값보다 크면 아예 버린다.
const MAX_ACCURACY_METERS = 30;
// 2) 오차 반경이 그럴듯해도 직전 좌표와 비교해 사람이 걸어서는 낼 수 없는
// 속도(순간이동급)로 튀었으면 버린다. 가벼운 조깅까지 감안해 넉넉히 잡는다.
const MAX_SPEED_METERS_PER_SECOND = 7;

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(a: Coords, b: Coords): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 진입 시점부터 좌표를 누적해 이동 경로를 만든다. 위치 권한은 온보딩 단계
 * 권한 게이트에서 이미 확보된 상태로 들어온다고 가정한다(재확인하지 않음).
 * enabled를 false로 주면(예: 일시정지) 추적을 멈추고 지금까지의 경로는 유지한다.
 */
export function useRouteTracking(enabled: boolean) {
  const [route, setRoute] = useState<Coords[]>([]);
  // watchPosition의 첫 고정밀 좌표는 몇 초 걸릴 수 있어서, 그 사이 지도가
  // 기본 위치(적도 부근)로 뜨는 걸 막으려고 대략적인 위치를 한 번 먼저
  // 조회해둔다. 실제 이동 경로(route)에는 섞지 않고 지도 초기 중심에만 쓴다.
  const [initialCoords, setInitialCoords] = useState<Coords | null>(null);
  const hasFetchedInitial = useRef(false);
  const watchId = useRef<number | null>(null);
  // 직전에 "채택한"(필터를 통과한) 좌표. 매 수신 좌표가 아니라 이 값과
  // 비교해야, 튄 좌표 하나가 다음 정상 좌표까지 연쇄로 걸러버리는 걸 막는다.
  const lastAcceptedRef = useRef<{ coords: Coords; timestamp: number } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!hasFetchedInitial.current) {
      hasFetchedInitial.current = true;
      getCurrentCoords()
        .then(setInitialCoords)
        .catch(() => {});
    }

    const handlePosition = (position: GeolocationResponse) => {
      const coords: Coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      if (position.coords.accuracy > MAX_ACCURACY_METERS) {
        return;
      }

      const lastAccepted = lastAcceptedRef.current;
      if (lastAccepted !== null) {
        const elapsedSeconds =
          (position.timestamp - lastAccepted.timestamp) / 1000;
        if (elapsedSeconds > 0) {
          const distanceMeters = haversineMeters(lastAccepted.coords, coords);
          if (distanceMeters / elapsedSeconds > MAX_SPEED_METERS_PER_SECOND) {
            return;
          }
        }
      }

      lastAcceptedRef.current = { coords, timestamp: position.timestamp };
      setRoute(previous => [...previous, coords]);
    };

    watchId.current = Geolocation.watchPosition(
      handlePosition,
      // TODO: 위치 조회 실패 시 사용자에게 알려줄지는 실제 연동 때 정한다.
      () => {},
      {
        enableHighAccuracy: true,
        distanceFilter: DISTANCE_FILTER_METERS,
        interval: UPDATE_INTERVAL_MS,
      },
    );

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled]);

  return { route, initialCoords };
}
