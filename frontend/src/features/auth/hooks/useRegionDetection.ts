import { useCallback, useState } from 'react';

import { getCurrentCoords } from '../../../shared/lib/geolocation';
import { checkPermission, requestPermission } from '../../../shared/lib/permissions';
import type { Region } from '../constants/regions';
import { resolveRegionByCoords } from '../model/resolveRegion';

export type RegionDetectionStatus =
  | 'idle'
  | 'detecting'
  | 'denied'
  | 'error';

type UseRegionDetectionResult = {
  status: RegionDetectionStatus;
  // 이미 위치 권한이 허용된 경우에만 조용히 좌표를 조회한다(권한 팝업을 띄우지 않음).
  detectIfPermitted: () => Promise<Region | null>;
  // 권한을 요청해서라도 위치를 조회한다(사용자가 명시적으로 눌렀을 때).
  detect: () => Promise<Region | null>;
};

/**
 * GPS 좌표를 시·도로 변환해 돌려준다. 실제 지역 상태는 화면이 소유한다.
 */
export function useRegionDetection(): UseRegionDetectionResult {
  const [status, setStatus] = useState<RegionDetectionStatus>('idle');

  const resolve = useCallback(async (): Promise<Region | null> => {
    setStatus('detecting');
    try {
      const coords = await getCurrentCoords();
      setStatus('idle');
      return resolveRegionByCoords(coords.latitude, coords.longitude);
    } catch {
      setStatus('error');
      return null;
    }
  }, []);

  const detectIfPermitted = useCallback(async (): Promise<Region | null> => {
    const granted = await checkPermission('location');
    if (!granted) {
      return null;
    }
    return resolve();
  }, [resolve]);

  const detect = useCallback(async (): Promise<Region | null> => {
    const result = await requestPermission('location');
    if (result !== 'granted') {
      setStatus('denied');
      return null;
    }
    return resolve();
  }, [resolve]);

  return { status, detectIfPermitted, detect };
}
