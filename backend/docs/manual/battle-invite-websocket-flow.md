# 배틀 초대 WebSocket 연동 흐름

## 핵심 원칙

- 배틀 초대 생성은 WebSocket 접속 여부와 무관하게 REST API로 처리한다.
- 최초 초대 도착은 WebSocket 이벤트가 아니라 기존 알림과 초대 목록 조회로 처리한다.
- Host와 Invitee는 배틀 방 화면 진입 시 `/ws` 연결과 `/user/queue/battle` 구독을 먼저 완료한다.
- Invitee는 WebSocket 구독 완료 후 초대 수락 API를 호출해야 카운트다운 이벤트를 안정적으로 받을 수 있다.
- WebSocket 이벤트를 놓친 경우 REST 조회로 현재 상태를 복구한다.

## 클라이언트 호출 순서

| 순서 | 클라이언트 동작 | 호출/API |
| --- | --- | --- |
| 1 | Host가 BATTLE 방 생성 | `POST /rooms` |
| 2 | Host가 배틀 방 대기 화면 진입 후 WebSocket 연결 | `CONNECT /ws` |
| 3 | Host가 개인 배틀 큐 구독 | `SUBSCRIBE /user/queue/battle` |
| 4 | Host가 상대 초대 | `POST /rooms/{roomId}/requests` |
| 5 | Invitee가 알림 또는 받은 초대 목록으로 초대 확인 | `GET /rooms/requests/received` |
| 6 | Invitee가 해당 배틀 방 화면 진입 후 WebSocket 연결 | `CONNECT /ws` |
| 7 | Invitee가 개인 배틀 큐 구독 | `SUBSCRIBE /user/queue/battle` |
| 8 | Invitee가 초대 수락 | `PATCH /rooms/{roomId}/requests/{requestId}/accept` |
| 9 | Host와 Invitee가 카운트다운 시작 이벤트 수신 | `/user/queue/battle` |
| 10 | 프론트가 3초 카운트다운 렌더링 | 클라이언트 처리 |
| 11 | 카운트다운 후 활성 빙고판 조회 | `GET /rooms/{roomId}/bingo-boards/active` |

## 초대 생성

```http
POST /rooms/{roomId}/requests
```

- 같은 방과 같은 초대 대상에 대해 `PENDING` 요청이 없으면 새 `GameRequest`를 저장한다.
- 새 요청이 생성되면 기존 `friendInvite` 알림 이벤트가 발행된다.
- 배틀 초대여도 `INVITATION_RECEIVED` WebSocket 이벤트는 발행하지 않는다.
- 같은 방과 같은 초대 대상의 `PENDING` 요청이 이미 있으면 새 row를 만들지 않고 기존 요청을 반환한다.
- 기존 요청을 반환하는 경우 `created=false`이며, 초대 알림도 다시 발행하지 않는다.

## 초대 수락

```http
PATCH /rooms/{roomId}/requests/{requestId}/accept
```

- Invitee는 이 API를 호출하기 전에 `/ws` 연결과 `/user/queue/battle` 구독을 완료해야 한다.
- 수락이 성공하면 요청 상태가 `ACCEPTED`로 변경되고 Invitee가 방 멤버로 추가된다.
- BATTLE 방의 참여 인원이 최대 인원에 도달하면 서버가 기존 배틀 게임 시작 로직을 실행한다.
- 게임 생성 트랜잭션이 커밋된 뒤 Host와 Invitee 양쪽 개인 큐로 `BATTLE_COUNTDOWN_STARTED` 이벤트가 전송된다.
- 서버는 3, 2, 1 이벤트를 각각 전송하지 않는다. 프론트가 `countdownSeconds` 값을 사용해 직접 렌더링한다.

## WebSocket 연결과 인증

```text
CONNECT /ws
Authorization: Bearer {accessToken}
```

- WebSocket 연결은 기존 JWT CONNECT 인증을 사용한다.
- 배틀 이벤트 수신 구독 경로는 `/user/queue/battle`이다.
- 서버 전송 destination은 내부적으로 `/user/{memberId}/queue/battle`로 해석된다.

## WebSocket 이벤트

### BATTLE_COUNTDOWN_STARTED

초대 수락 후 배틀 게임이 생성되면 Host와 Invitee 모두에게 전송된다.

```json
{
  "type": "BATTLE_COUNTDOWN_STARTED",
  "roomId": 10,
  "requestId": 20,
  "hostId": 1,
  "inviteeId": 2,
  "countdownSeconds": 3
}
```

### INVITATION_REJECTED

Invitee가 배틀 초대를 거절하면 Host에게 전송된다.

```json
{
  "type": "INVITATION_REJECTED",
  "roomId": 10,
  "requestId": 20,
  "hostId": 1,
  "inviteeId": 2,
  "countdownSeconds": null
}
```

### INVITATION_CANCELLED

Host가 배틀 초대를 취소하면 Invitee에게 전송된다.

```json
{
  "type": "INVITATION_CANCELLED",
  "roomId": 10,
  "requestId": 20,
  "hostId": 1,
  "inviteeId": 2,
  "countdownSeconds": null
}
```

## 복구 시나리오

- Invitee가 WebSocket 구독 전에 `accept`를 호출하면 카운트다운 이벤트를 놓칠 수 있다.
- 이벤트를 놓친 경우 프론트는 `GET /rooms/{roomId}/bingo-boards/active`로 게임 시작 여부와 활성 빙고판을 조회한다.
- 초대 상태 확인이 필요하면 `GET /rooms/requests/received` 또는 `GET /rooms/requests/sent`를 조회한다.
- 서버는 방 단위 WebSocket join 상태를 저장하지 않는다. 따라서 "구독 완료 후 accept 호출" 순서는 프론트가 보장해야 한다.
