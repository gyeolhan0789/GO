import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../lib/guard.js';
import { notifiedAccount } from './lib/setup.js';

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '30s',
  thresholds,
};

// 단일 API: PATCH /notifications/{notificationId}/read
// 친구 요청을 보내면 받는 쪽에 알림(FRIEND_REQUEST)이 생기는 걸 이용해 대상을 만든다.
export default function () {
  const { b, notificationId } = notifiedAccount(BASE_URL);

  const res = http.patch(`${BASE_URL}/notifications/${notificationId}/read`, null, b.headers);
  check(res, { '알림 읽음 처리 204': (r) => r.status === 204 });

  sleep(1);
}
