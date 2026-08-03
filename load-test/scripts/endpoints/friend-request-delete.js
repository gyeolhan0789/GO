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

// 단일 API: DELETE /friend-requests/{requestId} (보낸 사람이 취소)
export default function () {
  const { a, requestId } = pendingFriendRequest(BASE_URL);

  const res = http.del(`${BASE_URL}/friend-requests/${requestId}`, null, a.headers);
  check(res, { '친구 요청 취소 204': (r) => r.status === 204 });

  sleep(1);
}
