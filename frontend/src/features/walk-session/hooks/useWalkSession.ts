import { useEffect, useState } from 'react';

import {
  getWalkSessionElapsedSeconds,
  getWalkSessionRoomId,
  getWalkSessionStartHealthSummary,
  isWalkSessionPaused,
  subscribeWalkSession,
  togglePauseWalkSession,
} from '../model/walkSessionStore';

/**
 * 산책 세션의 경과 시간/일시정지 상태를 구독한다. 화면을 나갔다 들어와도
 * 시작 시각 기준으로 다시 계산되므로 0부터 새로 세지 않는다.
 */
export function useWalkSession() {
  const [roomId, setRoomId] = useState(getWalkSessionRoomId);
  const [startHealthSummary, setStartHealthSummary] = useState(
    getWalkSessionStartHealthSummary,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(getWalkSessionElapsedSeconds);
  const [isPaused, setPaused] = useState(isWalkSessionPaused);

  useEffect(() => {
    const sync = () => {
      setRoomId(getWalkSessionRoomId());
      setStartHealthSummary(getWalkSessionStartHealthSummary());
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

  return {
    roomId,
    startHealthSummary,
    elapsedSeconds,
    isPaused,
    togglePause: togglePauseWalkSession,
  };
}
