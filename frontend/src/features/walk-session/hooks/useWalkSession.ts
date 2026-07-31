import { useEffect, useState } from 'react';

import {
  getWalkSessionElapsedSeconds,
  getWalkSessionRoomId,
  getWalkSessionStartHealthSummary,
  isWalkSessionPaused,
  isWalkSessionStarted,
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
  // 시작 카운트다운이 끝나기 전까지는 false다(WalkSessionScreen이 이 값으로
  // 카운트다운 오버레이를 계속 보여줄지 판단한다).
  const [isStarted, setStarted] = useState(isWalkSessionStarted);

  useEffect(() => {
    const sync = () => {
      setRoomId(getWalkSessionRoomId());
      setStartHealthSummary(getWalkSessionStartHealthSummary());
      setElapsedSeconds(getWalkSessionElapsedSeconds());
      setPaused(isWalkSessionPaused());
      setStarted(isWalkSessionStarted());
    };
    sync();
    return subscribeWalkSession(sync);
  }, []);

  useEffect(() => {
    if (isPaused || !isStarted) {
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds(getWalkSessionElapsedSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, isStarted]);

  return {
    roomId,
    startHealthSummary,
    elapsedSeconds,
    isPaused,
    isStarted,
    togglePause: togglePauseWalkSession,
  };
}
