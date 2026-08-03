import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../lib/guard.js';
import { getAuthToken } from '../lib/auth.js';

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '30s',
  thresholds,
};

// 단일 API: GET /members/me
export default function () {
  const token = getAuthToken(BASE_URL);
  const headers = { headers: { Authorization: `Bearer ${token}` } };

  const res = http.get(`${BASE_URL}/members/me`, headers);
  check(res, { '내 정보 조회 200': (r) => r.status === 200 });

  sleep(1);
}
