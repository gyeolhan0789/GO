import http from 'k6/http';
import { check } from 'k6';
import { signupAndLogin } from '../../lib/auth.js';

// 매 호출마다 새 계정을 만들고 로그인 + 내 정보 조회까지 마친 상태를 반환한다.
// 단일 API 테스트는 반복마다 새로운 상태(친구 요청 대기중 등)가 필요해서
// scenario.js의 VU당 1회 캐시 방식과 달리 매번 새 계정을 만든다.
export function freshAccount(baseUrl) {
  const token = signupAndLogin(baseUrl);
  const headers = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  const me = http.get(`${baseUrl}/members/me`, headers);
  check(me, { 'setup: 내 정보 조회 200': (r) => r.status === 200 });
  return { token, headers, memberId: me.json('id') };
}

// a가 b에게 친구 요청을 보낸, 수락 전 상태(requestId 포함)를 반환한다.
export function pendingFriendRequest(baseUrl) {
  const a = freshAccount(baseUrl);
  const b = freshAccount(baseUrl);

  const sendRes = http.post(
    `${baseUrl}/friend-requests`,
    JSON.stringify({ inviteeId: b.memberId }),
    a.headers
  );
  check(sendRes, { 'setup: 친구 요청 전송 201': (r) => r.status === 201 });

  const received = http.get(`${baseUrl}/friend-requests`, b.headers);
  const match = (received.json('content') || []).find((r) => r.inviterId === a.memberId);
  return { a, b, requestId: match && match.requestId };
}

// a가 b에게 친구 요청을 보내 b에게 알림이 생긴 상태(notificationId 포함)를 반환한다.
export function notifiedAccount(baseUrl) {
  const { b } = pendingFriendRequest(baseUrl);

  const notifications = http.get(`${baseUrl}/notifications`, b.headers);
  check(notifications, { 'setup: 알림 조회 200': (r) => r.status === 200 });
  const first = (notifications.json('content') || [])[0];
  return { b, notificationId: first && first.id };
}

// a, b가 서로 친구인 상태를 반환한다.
export function friendPair(baseUrl) {
  const { a, b, requestId } = pendingFriendRequest(baseUrl);
  const acceptRes = http.patch(`${baseUrl}/friend-requests/${requestId}/accept`, null, b.headers);
  check(acceptRes, { 'setup: 친구 요청 수락 204': (r) => r.status === 204 });
  return { a, b };
}

// 친구 사이인 a가 COOPERATE 방을 만든 상태(초대 전)를 반환한다.
export function roomWithFriend(baseUrl) {
  const { a, b } = friendPair(baseUrl);

  const createRoomRes = http.post(
    `${baseUrl}/rooms`,
    JSON.stringify({
      name: `[k6] ${__VU}`,
      mode: 'COOPERATE',
      targetBingoCount: 1,
      targetStepCount: 1000,
      boardSize: 3,
    }),
    a.headers
  );
  check(createRoomRes, { 'setup: 방 생성 200': (r) => r.status === 200 });
  return { a, b, roomId: createRoomRes.json('roomId') };
}

// 친구 사이인 a가 COOPERATE 방을 만들어 b를 초대한, 수락 전 상태(requestId 포함)를 반환한다.
export function pendingGameRequest(baseUrl) {
  const { a, b, roomId } = roomWithFriend(baseUrl);

  const inviteRes = http.post(
    `${baseUrl}/rooms/${roomId}/requests`,
    JSON.stringify({ inviteeId: b.memberId }),
    a.headers
  );
  check(inviteRes, { 'setup: 게임 요청 전송': (r) => r.status === 200 || r.status === 201 });
  return { a, b, roomId, requestId: inviteRes.json('requestId') };
}
