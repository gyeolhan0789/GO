import { useEffect, useState } from 'react';

import {
  getWalkSessionCalories,
  getWalkSessionContinuousActiveMs,
  getWalkSessionContinuousSteps,
  getWalkSessionDistanceMeters,
  getWalkSessionElapsedMs,
  getWalkSessionElapsedSeconds,
  getWalkSessionRoomId,
  getWalkSessionSteps,
  isWalkSessionActive,
  isWalkSessionBlockedByOtherRoom,
  isWalkSessionEndRequested,
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
  // 화면은 초만 쓰지만 워치로는 내림하지 않은 값을 보내야 한다(내림이 두 번
  // 겹치면 폰과 워치가 1초쯤 어긋난다 — getWalkSessionElapsedMs 주석 참고).
  const [elapsedMs, setElapsedMs] = useState(getWalkSessionElapsedMs);
  const [isPaused, setPaused] = useState(isWalkSessionPaused);
  const [isActive, setActive] = useState(isWalkSessionActive);
  // 시작 카운트다운이 끝나기 전까지는 false다(WalkSessionScreen이 이 값으로
  // 카운트다운 오버레이를 계속 보여줄지 판단한다).
  const [isStarted, setStarted] = useState(isWalkSessionStarted);
  const [steps, setSteps] = useState(getWalkSessionSteps);
  const [distanceMeters, setDistanceMeters] = useState(getWalkSessionDistanceMeters);
  const [calories, setCalories] = useState(getWalkSessionCalories);
  const [continuousSteps, setContinuousSteps] = useState(getWalkSessionContinuousSteps);
  const [continuousActiveMs, setContinuousActiveMs] = useState(
    getWalkSessionContinuousActiveMs,
  );
  // 워치에서 "산책 종료"를 눌렀다는 표시. WalkSessionScreen이 보고 폰의
  // 종료 흐름(기록 저장 -> 결과 화면)을 그대로 탄다.
  const [isEndRequested, setEndRequested] = useState(isWalkSessionEndRequested);
  // 다른 방의 미종료 세션 때문에 이번 산책이 서버에 기록되지 않는 상태.
  const [isSessionBlocked, setSessionBlocked] = useState(isWalkSessionBlockedByOtherRoom);

  useEffect(() => {
    const sync = () => {
      setRoomId(getWalkSessionRoomId());
      setElapsedSeconds(getWalkSessionElapsedSeconds());
      setElapsedMs(getWalkSessionElapsedMs());
      setPaused(isWalkSessionPaused());
      setActive(isWalkSessionActive());
      setStarted(isWalkSessionStarted());
      setSteps(getWalkSessionSteps());
      setDistanceMeters(getWalkSessionDistanceMeters());
      setCalories(getWalkSessionCalories());
      setContinuousSteps(getWalkSessionContinuousSteps());
      setContinuousActiveMs(getWalkSessionContinuousActiveMs());
      setEndRequested(isWalkSessionEndRequested());
      setSessionBlocked(isWalkSessionBlockedByOtherRoom());
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
      setElapsedMs(getWalkSessionElapsedMs());
      setContinuousActiveMs(getWalkSessionContinuousActiveMs());
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, isStarted]);

  return {
    roomId,
    elapsedSeconds,
    elapsedMs,
    isPaused,
    isActive,
    isStarted,
    steps,
    distanceMeters,
    calories,
    continuousSteps,
    continuousActiveMs,
    isEndRequested,
    isSessionBlocked,
    togglePause: togglePauseWalkSession,
  };
}
