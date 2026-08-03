import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../lib/guard.js';
import { pendingGameRequest } from './lib/setup.js';

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '30s',
  thresholds,
};

// 단일 API: GET /rooms/requests/received
export default function () {
  const { b } = pendingGameRequest(BASE_URL);

  const res = http.get(`${BASE_URL}/rooms/requests/received`, b.headers);
  check(res, { '받은 게임 요청 조회 200': (r) => r.status === 200 });

  sleep(1);
}
