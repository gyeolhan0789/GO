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

let patchCounter = 0;

// 단일 API: PATCH /members/me
export default function () {
  const token = getAuthToken(BASE_URL);
  const headers = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  // 닉네임 중복(409) 방지를 위해 매 호출마다 다른 값을 준다.
  const seq = patchCounter++;
  const ts36 = Date.now().toString(36).slice(-4);
  const vu36 = (__VU % 1296).toString(36).padStart(2, '0');
  const seq36 = (seq % 1296).toString(36).padStart(2, '0');
  const nickname = `p${ts36}${vu36}${seq36}`;

  const res = http.patch(
    `${BASE_URL}/members/me`,
    JSON.stringify({ nickname }),
    headers
  );
  check(res, { '프로필 수정 204': (r) => r.status === 204 });

  sleep(1);
}
