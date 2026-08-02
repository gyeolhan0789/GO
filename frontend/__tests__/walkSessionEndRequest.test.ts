/**
 * @format
 */

import {
  clearWalkSessionEndRequest,
  confirmWalkSessionStart,
  endWalkSession,
  isWalkSessionEndRequested,
  requestWalkSessionEnd,
  startWalkSession,
  subscribeWalkSession,
} from '../src/features/walk-session/model/walkSessionStore';

// 모듈 싱글턴이라 테스트끼리 상태가 새어나간다.
afterEach(endWalkSession);

describe('워치에서 온 산책 종료 요청', () => {
  test('진행 중인 산책이 없으면 요청이 서지 않는다', () => {
    requestWalkSessionEnd();

    expect(isWalkSessionEndRequested()).toBe(false);
  });

  test('진행 중이면 요청이 서고, 구독자에게 알린다', () => {
    startWalkSession(7);
    confirmWalkSessionStart();
    const listener = jest.fn();
    const unsubscribe = subscribeWalkSession(listener);

    requestWalkSessionEnd();

    expect(isWalkSessionEndRequested()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test('같은 요청이 두 번 와도 알림은 한 번뿐이다', () => {
    startWalkSession(7);
    requestWalkSessionEnd();
    const listener = jest.fn();
    const unsubscribe = subscribeWalkSession(listener);

    requestWalkSessionEnd();

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  test('종료 흐름을 시작한 화면이 요청을 비우면 다시 타지 않는다', () => {
    startWalkSession(7);
    requestWalkSessionEnd();

    clearWalkSessionEndRequest();

    expect(isWalkSessionEndRequested()).toBe(false);
  });

  test('산책이 끝나면 남아 있던 요청도 같이 사라진다', () => {
    startWalkSession(7);
    requestWalkSessionEnd();

    endWalkSession();

    expect(isWalkSessionEndRequested()).toBe(false);
  });

  test('다음 산책을 시작할 때 이전 요청이 따라오지 않는다', () => {
    startWalkSession(7);
    requestWalkSessionEnd();
    endWalkSession();

    startWalkSession(8);

    expect(isWalkSessionEndRequested()).toBe(false);
  });
});
