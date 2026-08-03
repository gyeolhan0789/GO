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

// 단일 API: DELETE /friends/{friendId} (friendId는 상대방의 memberId)
export default function () {
  const { a, b } = friendPair(BASE_URL);

  const res = http.del(`${BASE_URL}/friends/${b.memberId}`, null, a.headers);
  check(res, { '친구 삭제 204': (r) => r.status === 204 });

  sleep(1);
}
