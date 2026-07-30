import { useEffect, useState } from 'react';

import {
  getWalkSessionElapsedSeconds,
  isWalkSessionPaused,
  subscribeWalkSession,
  togglePauseWalkSession,
} from '../model/walkSessionStore';

/**
 * 산책 세션의 경과 시간/일시정지 상태를 구독한다. 화면을 나갔다 들어와도
 * 시작 시각 기준으로 다시 계산되므로 0부터 새로 세지 않는다.
 */
export function useWalkSession() {
  const [elapsedSeconds, setElapsedSeconds] = useState(getWalkSessionElapsedSeconds);
  const [isPaused, setPaused] = useState(isWalkSessionPaused);

  useEffect(() => {
    const sync = () => {
      setElapsedSeconds(getWalkSessionElapsedSeconds());
      setPaused(isWalkSessionPaused());
    };
    sync();
    return subscribeWalkSession(sync);
  }, []);

  useEffect(() => {
    if (isPaused) {
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds(getWalkSessionElapsedSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  return { elapsedSeconds, isPaused, togglePause: togglePauseWalkSession };
}
