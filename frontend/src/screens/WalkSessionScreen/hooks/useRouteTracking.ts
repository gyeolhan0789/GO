import { useEffect, useRef, useState } from 'react';
import Geolocation from '@react-native-community/geolocation';

import { getCurrentCoords, type Coords } from '../../../shared/lib/geolocation';

// 걷는 동안에는 5m 이상 움직였을 때만, 최소 5초 간격으로 좌표를 찍는다.
// 너무 촘촘히 찍으면 배터리도 많이 쓰고 폴리라인도 지그재그로 떨린다.
const DISTANCE_FILTER_METERS = 5;
const UPDATE_INTERVAL_MS = 5000;

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

    watchId.current = Geolocation.watchPosition(
      position => {
        setRoute(previous => [
          ...previous,
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        ]);
      },
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
