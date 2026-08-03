import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../lib/guard.js';
import { friendPair } from './lib/setup.js';

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '30s',
  thresholds,
};

// 단일 API: GET /friends
export default function () {
  const { a } = friendPair(BASE_URL);

  const res = http.get(`${BASE_URL}/friends`, a.headers);
  check(res, { '친구 목록 조회 200': (r) => r.status === 200 });

  sleep(1);
}
