import http from 'k6/http';
import { check, sleep } from 'k6';
import { getAuthToken } from './auth.js';
import { BASE_URL } from './guard.js';

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

// 인증 → 방 생성/조회/수정/삭제 흐름. load/stress/spike 스크립트가 공유하는 실제 시나리오이며,
// 부하 패턴(options)만 각 스크립트에서 다르게 지정한다.
export function runScenario() {
  const token = getAuthToken(BASE_URL);
  const authHeaders = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  check(http.get(`${BASE_URL}/rooms`, authHeaders), {
    '방 목록 조회 200': (r) => r.status === 200,
  });

  // 방 생성 (SINGLE 모드는 생성과 동시에 게임 시작)
  const createRes = http.post(
    `${BASE_URL}/rooms`,
    JSON.stringify({
      name: `[k6] ${__VU}`,
      mode: 'SINGLE',
      targetBingoCount: 1,
      targetStepCount: 1000,
      boardSize: 3,
    }),
    authHeaders
  );
  const created = check(createRes, { '방 생성 200': (r) => r.status === 200 });
  if (!created) {
    sleep(1);
    return;
  }
  const roomId = createRes.json('roomId');

  check(http.get(`${BASE_URL}/rooms/${roomId}`, authHeaders), {
    '방 상세 조회 200': (r) => r.status === 200,
  });

  check(
    http.patch(
      `${BASE_URL}/rooms/${roomId}`,
      JSON.stringify({ name: `[k6] ${__VU} renamed` }),
      authHeaders
    ),
    { '방 이름 변경 204': (r) => r.status === 204 }
  );

  check(http.get(`${BASE_URL}/rooms/${roomId}/members`, authHeaders), {
    '방 멤버 조회 200': (r) => r.status === 200,
  });

  check(http.get(`${BASE_URL}/rooms/${roomId}/bingo-boards/active`, authHeaders), {
    '빙고판 조회 200': (r) => r.status === 200,
  });

  // 정리 (방 나가기/삭제 중 하나 — 커버리지용, 짝/홀 이터레이션으로 번갈아 호출)
  if (__ITER % 2 === 0) {
    check(http.del(`${BASE_URL}/rooms/${roomId}`, null, authHeaders), {
      '방 삭제 204': (r) => r.status === 204,
    });
  } else {
    check(http.del(`${BASE_URL}/rooms/${roomId}/members/me`, null, authHeaders), {
      '방 나가기 204': (r) => r.status === 204,
    });
  }

  sleep(1);
}
