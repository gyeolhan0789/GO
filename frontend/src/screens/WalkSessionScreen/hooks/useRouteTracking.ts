import { useEffect, useRef, useState } from 'react';

import { getCurrentCoords, type Coords } from '../../../shared/lib/geolocation';
import { getWalkTrackingRoute, subscribeWalkTrackingRoute } from '../../../shared/lib/walkTracking';

/**
 * 산책 경로를 보여준다. 실제 GPS 추적(정확도/속도 필터 포함)은 네이티브
 * WalkForegroundService가 소유하며, 이 훅은 그 결과를 하이드레이션 + 구독만
 * 한다 — 일시정지 여부는 네이티브 세션 상태가 결정하므로 이 훅은 몰라도 된다.
 */
export function useRouteTracking() {
  const [route, setRoute] = useState<Coords[]>([]);
  // 네이티브의 첫 GPS 픽스는 몇 초 걸릴 수 있어서, 그 사이 지도가 기본
  // 위치(적도 부근)로 뜨는 걸 막으려고 대략적인 위치를 한 번 먼저 조회해둔다.
  // 실제 이동 경로(route)에는 섞지 않고 지도 초기 중심에만 쓴다.
  const [initialCoords, setInitialCoords] = useState<Coords | null>(null);
  const hasFetchedInitial = useRef(false);

  useEffect(() => {
    if (!hasFetchedInitial.current) {
      hasFetchedInitial.current = true;
      getCurrentCoords()
        .then(setInitialCoords)
        .catch(() => {});
    }

    getWalkTrackingRoute()
      .then(points => setRoute(points.map(p => ({ latitude: p.latitude, longitude: p.longitude }))))
      .catch(() => {});

    return subscribeWalkTrackingRoute(point => {
      setRoute(previous => [
        ...previous,
        { latitude: point.latitude, longitude: point.longitude },
      ]);
    });
  }, []);

  return { route, initialCoords };
}
