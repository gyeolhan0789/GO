import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../lib/guard.js';
import { freshAccount } from './lib/setup.js';

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '30s',
  thresholds,
};

// 단일 API: POST /histories
// historyDate는 (memberId, date) 단위로 유일해야 할 가능성이 있어 매 반복 새 계정을 사용한다.
export default function () {
  const account = freshAccount(BASE_URL);

  const res = http.post(
    `${BASE_URL}/histories`,
    JSON.stringify({
      historyDate: new Date().toISOString().slice(0, 10),
      step: 1000,
      distance: 700,
      calories: 50,
    }),
    account.headers
  );
  check(res, { '걸음 기록 저장 201': (r) => r.status === 201 });

  sleep(1);
}
