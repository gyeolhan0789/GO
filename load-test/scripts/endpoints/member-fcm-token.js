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

// 단일 API: PATCH /members/me/fcm-token
export default function () {
  const token = getAuthToken(BASE_URL);
  const headers = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  const fcmToken = `k6-fcm-${__VU}-${Date.now()}`;
  const res = http.patch(
    `${BASE_URL}/members/me/fcm-token`,
    JSON.stringify({ fcmToken }),
    headers
  );
  check(res, { 'FCM 토큰 갱신 204': (r) => r.status === 204 });

  sleep(1);
}
