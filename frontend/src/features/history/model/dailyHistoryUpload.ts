import { getMyPage } from '../../member/api/memberApi';
import { todayIso } from '../../../shared/lib/isoDate';
import { pendingStepUploads } from '../../../shared/lib/stepLedger';
import { reportStepsToLedger } from '../../../shared/lib/stepLedgerSync';
import { readStepLedger } from '../../../shared/lib/stepLedgerStorage';
import {
  estimateCalories,
  estimateDistanceMeters,
} from '../../../shared/lib/stepEstimate';
import { saveHistory } from '../api/historyApi';

/**
 * 아직 서버에 안 올린 지난 날짜의 걸음을 올린다. 올린 날짜 수를 돌려준다.
 *
 * 앱이 앞으로 올 때 부른다. 자정마다 백그라운드로 깨어나 보내려면 정확 알람과 포그라운드
 * 서비스 권한이 필요한데, 걸음 자체는 원장이 날짜별로 확정해 두므로 전송이 며칠 늦어도
 * 수치는 어긋나지 않는다 — 늦어지는 건 랭킹·친구 주간 걸음수 반영 시점뿐이다.
 *
 * 거리·칼로리는 저장하지 않고 보낼 때 환산한다. 걸음 센서는 걸음수만 주고 환산에 성별이
 * 필요한데, 원장에 쓰는 시점에는 회원 정보가 아직 없을 수 있다.
 */
export async function uploadPendingDailyHistories(): Promise<number> {
  const pending = pendingStepUploads(await readStepLedger(), todayIso());
  if (pending.length === 0) {
    return 0;
  }

  const { gender } = await getMyPage();
  let uploaded = 0;

  for (const { date, steps } of pending) {
    try {
      await saveHistory({
        historyDate: date,
        step: Math.round(steps),
        distance: Math.round(estimateDistanceMeters(steps, gender)),
        calories: Math.round(estimateCalories(steps, gender)),
      });
    } catch {
      // 한 날짜가 실패해도 나머지는 계속 보낸다. 실패한 날은 원장에 그대로 남아
      // 다음 기회에 다시 시도된다.
      continue;
    }
    // 보낸 직후 바로 반영한다. 여러 날짜를 한 번에 모아 저장하면, 중간에 앱이 죽었을 때
    // 이미 보낸 날짜가 미전송으로 남아 두 번 더해진다.
    await reportStepsToLedger(date, steps);
    uploaded += 1;
  }

  return uploaded;
}
