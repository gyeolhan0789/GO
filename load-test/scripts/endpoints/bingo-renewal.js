import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL } from '../lib/guard.js';

const vus = Number(__ENV.VUS || 5);
const iterations = Number(__ENV.ITERATIONS || 100);
const fixturePassword = __ENV.FIXTURE_PASSWORD || 'DevUser1!';

if (!Number.isInteger(vus) || vus < 1) {
  throw new Error(`VUS는 1 이상의 정수여야 합니다: ${__ENV.VUS}`);
}
if (!Number.isInteger(iterations) || iterations < vus) {
  throw new Error(`ITERATIONS는 VUS 이상의 정수여야 합니다: VUS=${vus}, ITERATIONS=${iterations}`);
}

const renewalDuration = new Trend('renewal_duration', true);
const renewalFailed = new Rate('renewal_failed');

export const thresholds = {
  'http_req_failed{endpoint:renewal}': ['rate<0.01'],
  'http_req_duration{endpoint:renewal}': ['p(95)<500', 'p(99)<1000'],
  'checks{endpoint:renewal}': ['rate>0.99'],
  renewal_failed: ['rate<0.01'],
  renewal_duration: ['p(95)<500', 'p(99)<1000'],
};

export const options = {
  setupTimeout: __ENV.SETUP_TIMEOUT || '5m',
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    renewal: {
      executor: 'shared-iterations',
      vus,
      iterations,
      maxDuration: __ENV.MAX_DURATION || '5m',
    },
  },
  thresholds,
};

function fixtureSuffix(fixtureNumber) {
  return String(fixtureNumber).padStart(5, '0');
}

function fixtureEmail(fixtureNumber) {
  return `k6-renew-${fixtureSuffix(fixtureNumber)}@k6.local`;
}

function fixtureRoomName(fixtureNumber) {
  return `k6-renew-${fixtureSuffix(fixtureNumber)}`;
}

// 준비 요청을 측정 구간에서 분리한다. 각 계정은 renewal-prepare.sql이 만든 방 하나만 가진다.
export function setup() {
  const fixtures = [];

  for (let fixtureNumber = 1; fixtureNumber <= iterations; fixtureNumber += 1) {
    const loginResponse = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({
        email: fixtureEmail(fixtureNumber),
        password: fixturePassword,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { phase: 'setup', endpoint: 'fixture-login' },
      }
    );

    const loginSucceeded = check(loginResponse, {
      'setup: 갱신 계정 로그인 200': (response) => response.status === 200,
    });
    if (!loginSucceeded) {
      throw new Error(`fixture ${fixtureNumber} 로그인 실패: status=${loginResponse.status}`);
    }

    const token = loginResponse.json('accessToken');
    const roomResponse = http.get(`${BASE_URL}/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { phase: 'setup', endpoint: 'fixture-room' },
    });
    const rooms = roomResponse.status === 200 ? roomResponse.json() : [];
    const room = Array.isArray(rooms)
      ? rooms.find((candidate) => candidate.name === fixtureRoomName(fixtureNumber))
      : null;

    const roomLookupSucceeded = check(roomResponse, {
      'setup: 갱신 대상 방 조회 200': (response) => response.status === 200,
      'setup: 갱신 대상 방 식별': () => Boolean(room && room.roomId),
    });
    if (!roomLookupSucceeded || !room || !room.roomId) {
      throw new Error(`fixture ${fixtureNumber} 방 조회 실패: status=${roomResponse.status}`);
    }

    fixtures.push({ roomId: room.roomId, token });
  }

  return fixtures;
}

// 단일 API: POST /rooms/{roomId}/bingo-boards/renewal
// iteration마다 서로 다른 만료 방을 한 번만 사용해 상태 소비와 락 경합을 분리한다.
export default function (fixtures) {
  const fixture = fixtures[exec.scenario.iterationInTest];
  if (!fixture) {
    throw new Error(`iteration에 대응하는 fixture가 없습니다: ${exec.scenario.iterationInTest}`);
  }

  const response = http.post(
    `${BASE_URL}/rooms/${fixture.roomId}/bingo-boards/renewal`,
    JSON.stringify({
      boardSize: 3,
      targetBingoCount: 1,
      targetStepCount: 1000,
    }),
    {
      headers: {
        Authorization: `Bearer ${fixture.token}`,
        'Content-Type': 'application/json',
      },
      tags: { phase: 'measurement', endpoint: 'renewal' },
    }
  );

  const succeeded = check(
    response,
    { '빙고판 갱신 201': (result) => result.status === 201 },
    { endpoint: 'renewal' }
  );
  renewalDuration.add(response.timings.duration);
  renewalFailed.add(!succeeded);
}
