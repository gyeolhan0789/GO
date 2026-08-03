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

// 단일 API: POST /friend-requests
export default function () {
  const a = freshAccount(BASE_URL);
  const b = freshAccount(BASE_URL);

  const res = http.post(
    `${BASE_URL}/friend-requests`,
    JSON.stringify({ inviteeId: b.memberId }),
    a.headers
  );
  check(res, { '친구 요청 전송 201': (r) => r.status === 201 });

  sleep(1);
}
