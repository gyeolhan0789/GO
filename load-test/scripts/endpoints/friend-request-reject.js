import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../lib/guard.js';
import { pendingFriendRequest } from './lib/setup.js';

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '30s',
  thresholds,
};

// 단일 API: PATCH /friend-requests/{requestId}/reject
export default function () {
  const { b, requestId } = pendingFriendRequest(BASE_URL);

  const res = http.patch(`${BASE_URL}/friend-requests/${requestId}/reject`, null, b.headers);
  check(res, { '친구 요청 거절 204': (r) => r.status === 204 });

  sleep(1);
}
