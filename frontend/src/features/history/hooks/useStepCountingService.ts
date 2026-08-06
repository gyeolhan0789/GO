import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../auth/model/AuthContext';
import { useSamsungHealthToday } from '../../../shared/hooks/useSamsungHealthToday';
import { checkPermission } from '../../../shared/lib/permissions';
import {
  isStepSensorAvailable,
  startStepCounting,
  stopStepCounting,
} from '../../../shared/lib/stepSensor';

/**
 * 걸음 집계 상주 서비스(StepCountingService)를 켜고 끈다.
 *
 * 삼성 센서허브의 만보기는 구독자가 붙어 있는 동안에만 돈다. 삼성헬스가 깔린 기기는 그
 * 앱이 상시 구독자 노릇을 해주지만, 없는 기기는 아무도 구독하지 않아 센서 누적치가 아예
 * 멈춘다 — 그래서 대체 경로를 쓰는 기기에서만 이 서비스를 띄운다.
 *
 * 화면을 떠나도(언마운트) 서비스를 내리지 않는다. 앱이 꺼진 동안에도 세는 것이 이
 * 서비스의 존재 이유라, 여기서 정리해버리면 하루 종일 집계가 그대로 무너진다. 내리는
 * 경우는 삼성헬스를 쓰게 된 기기 하나뿐이다.
 *
 * 판단 기준은 [[useStepDataToday]]의 폴백 기준과 같은 useSamsungHealthToday다. 오늘
 * 걸음수를 어디서 읽는지와 서비스를 띄우는지가 어긋나지 않는다.
 */
export function useStepCountingService() {
  const { isAuthenticated } = useAuth();
  const status = useSamsungHealthToday({ enabled: isAuthenticated }).data
    ?.status;

  useEffect(() => {
    // 판단이 끝나기 전에는 켜지도 끄지도 않는다. 여기서 성급히 끄면 앱을 열 때마다
    // 서비스가 잠깐 내려갔다 올라오면서 그 사이 걸음을 잃는다.
    if (!isAuthenticated || status === undefined) {
      return;
    }
    if (status === 'ok' || status === 'error') {
      // 삼성헬스에서 읽는 기기. 상주 알림만 늘고 얻는 게 없다.
      stopStepCounting();
      return;
    }

    let cancelled = false;

    async function begin() {
      if (!isStepSensorAvailable()) {
        return;
      }
      // health 타입 포그라운드 서비스는 ACTIVITY_RECOGNITION이 있어야 뜬다.
      if (!(await checkPermission('activityRecognition')) || cancelled) {
        return;
      }
      await startStepCounting();
    }

    begin();

    // 앱이 앞으로 올 때마다 다시 부른다. 이미 떠 있으면 아무 일도 일어나지 않고,
    // OS가 서비스를 걷어갔거나 백그라운드 기동이 막혀 실패했던 경우에 되살아난다.
    // 이게 없으면 한 번 죽은 뒤로는 앱을 재시작할 때까지 걸음을 세지 않는다.
    const subscription = AppState.addEventListener('change', appStatus => {
      if (appStatus === 'active') {
        begin();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isAuthenticated, status]);
}
