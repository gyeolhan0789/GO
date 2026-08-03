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

// getAuthToken이 만드는 계정의 초기 비밀번호(auth.js 참고)와 맞바꿔 쓸 두 번째 비밀번호.
// 매 호출마다 currentPassword <-> alternatePassword를 교체해가며 변경한다.
const INITIAL_PASSWORD = 'Test1234!';
const ALTERNATE_PASSWORD = 'Retest12@';
let currentPassword = INITIAL_PASSWORD;

// 단일 API: PATCH /members/password
export default function () {
  const token = getAuthToken(BASE_URL);
  const headers = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  const newPassword = currentPassword === INITIAL_PASSWORD ? ALTERNATE_PASSWORD : INITIAL_PASSWORD;
  const res = http.patch(
    `${BASE_URL}/members/password`,
    JSON.stringify({ currentPassword, newPassword }),
    headers
  );
  const changed = check(res, { '비밀번호 변경 204': (r) => r.status === 204 });
  if (changed) {
    currentPassword = newPassword;
  }

  sleep(1);
}
