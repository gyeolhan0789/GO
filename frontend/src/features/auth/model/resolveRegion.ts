import { REGION_ANCHORS } from '../constants/regionAnchors';
import type { Region } from '../constants/regions';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// 두 좌표 사이의 하버사인 거리(km). 시·도 최근접 판정에만 쓰므로 정밀도는 충분하다.
function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * GPS 좌표에서 가장 가까운 대표 도시(앵커)가 속한 시·도를 반환한다.
 * 경계 부근에서는 인접 시·도로 잡힐 수 있어 사용자가 직접 수정할 수 있어야 한다.
 */
export function resolveRegionByCoords(
  latitude: number,
  longitude: number,
): Region {
  let nearest: Region = REGION_ANCHORS[0].region;
  let minDistance = Infinity;

  for (const anchor of REGION_ANCHORS) {
    const distance = haversineKm(
      latitude,
      longitude,
      anchor.latitude,
      anchor.longitude,
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = anchor.region;
    }
  }

  return nearest;
}
