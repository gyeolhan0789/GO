import { useEffect, useState } from 'react';

import {
  getWalkSessionCalories,
  getWalkSessionDistanceMeters,
  getWalkSessionElapsedSeconds,
  getWalkSessionRoomId,
  getWalkSessionSteps,
  isWalkSessionActive,
  isWalkSessionPaused,
  isWalkSessionStarted,
  subscribeWalkSession,
  togglePauseWalkSession,
} from '../model/walkSessionStore';

/**
 * 산책 세션의 경과 시간/일시정지/걸음수·거리·칼로리 상태를 구독한다. 화면을
 * 나갔다 들어와도 시작 시각 기준으로 다시 계산되므로 0부터 새로 세지 않는다.
 */
export function useWalkSession() {
  const [roomId, setRoomId] = useState(getWalkSessionRoomId);
  const [elapsedSeconds, setElapsedSeconds] = useState(getWalkSessionElapsedSeconds);
  const [isPaused, setPaused] = useState(isWalkSessionPaused);
  const [isActive, setActive] = useState(isWalkSessionActive);
  // 시작 카운트다운이 끝나기 전까지는 false다(WalkSessionScreen이 이 값으로
  // 카운트다운 오버레이를 계속 보여줄지 판단한다).
  const [isStarted, setStarted] = useState(isWalkSessionStarted);
  const [steps, setSteps] = useState(getWalkSessionSteps);
  const [distanceMeters, setDistanceMeters] = useState(getWalkSessionDistanceMeters);
  const [calories, setCalories] = useState(getWalkSessionCalories);

  useEffect(() => {
    const sync = () => {
      setRoomId(getWalkSessionRoomId());
      setElapsedSeconds(getWalkSessionElapsedSeconds());
      setPaused(isWalkSessionPaused());
      setActive(isWalkSessionActive());
      setStarted(isWalkSessionStarted());
      setSteps(getWalkSessionSteps());
      setDistanceMeters(getWalkSessionDistanceMeters());
      setCalories(getWalkSessionCalories());
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
    elapsedSeconds,
    isPaused,
    isActive,
    isStarted,
    steps,
    distanceMeters,
    calories,
    togglePause: togglePauseWalkSession,
  };
}
