import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/model/AuthContext';
import { syncStepLedger } from '../../../shared/lib/stepLedgerSync';
import { uploadPendingDailyHistories } from '../model/dailyHistoryUpload';

/**
 * 앱이 앞으로 올 때마다 걸음 원장을 갱신하고, 하루가 끝나 확정된 날짜를 서버에 올린다.
 *
 * 그리는 게 없어 화면과 무관하게 돌아야 하므로 앱 최상단에 한 번만 붙인다. 로그인
 * 상태에서만 동작한다 — 전송이 회원 정보(성별로 거리·칼로리 환산)와 인증을 쓴다.
 *
 * 원장 갱신을 여기서도 하는 이유: 걸음수를 보여주지 않는 화면에 머물러 있어도 센서를
 * 읽어둬야 자정·재부팅 경계에서 다음 날로 밀리는 구간이 짧아진다.
 */
export function useDailyStepSync() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function settle() {
      await syncStepLedger();
      if (cancelled) {
        return;
      }
      // 실패는 삼킨다. 못 올린 날짜는 원장에 남아 다음 기회에 다시 시도되고, 여기서
      // 던지면 앱을 열 때마다 처리되지 않는 예외가 된다.
      const uploaded = await uploadPendingDailyHistories().catch(() => 0);
      if (cancelled || uploaded === 0) {
        return;
      }
      // 방금 올린 날짜가 기록 화면 그래프와 랭킹에 반영되도록 다시 읽게 한다.
      queryClient.invalidateQueries({ queryKey: ['histories'] });
    }

    settle();
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') {
        settle();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isAuthenticated, queryClient]);
}
