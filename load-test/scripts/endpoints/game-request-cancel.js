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

// 단일 API: PATCH /rooms/{roomId}/requests/{requestId}/cancel
export default function () {
  const { a, roomId, requestId } = pendingGameRequest(BASE_URL);

  const res = http.patch(`${BASE_URL}/rooms/${roomId}/requests/${requestId}/cancel`, null, a.headers);
  check(res, { '게임 요청 취소 204': (r) => r.status === 204 });

  sleep(1);
}
