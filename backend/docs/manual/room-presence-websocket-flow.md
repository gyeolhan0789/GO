# 방 Presence WebSocket 연동 흐름

## 핵심 원칙

- 방 Presence는 방 화면에서 현재 접속 중인 멤버 목록을 보여주기 위한 WebSocket 이벤트이다.
- 별도 REST API는 없다.
- 프론트가 방 화면에 진입해 `/topic/rooms/{roomId}/presence`를 구독하면 입장으로 처리한다.
- 프론트가 구독을 해제하거나 WebSocket 연결이 끊기면 퇴장으로 처리한다.
- Presence 대상은 해당 방의 `RoomMember`만이다.
- 배틀 초대 수락 전 invitee는 아직 방 멤버가 아니므로 room presence에 포함되지 않는다.
- 서버는 `JOINED`, `LEFT`, `SYNC` 이벤트를 보낼 때마다 현재 접속자 목록 전체 스냅샷을 함께 내려준다.

## 클라이언트 연결 순서

| 순서 | 클라이언트 동작 | WebSocket |
| --- | --- | --- |
| 1 | 방 화면 진입 | `CONNECT /ws` |
| 2 | JWT 인증 헤더 전달 | `Authorization: Bearer {accessToken}` |
| 3 | 방 Presence 구독 | `SUBSCRIBE /topic/rooms/{roomId}/presence` |
| 4 | `JOINED` 또는 `SYNC` 수신 | `/topic/rooms/{roomId}/presence` |
| 5 | 수신 payload의 `onlineMembers`로 접속자 목록 렌더링 | 클라이언트 처리 |
| 6 | 방 화면 이탈 | `UNSUBSCRIBE /topic/rooms/{roomId}/presence` |

```text
CONNECT /ws
Authorization: Bearer {accessToken}

SUBSCRIBE /topic/rooms/{roomId}/presence
```

## 구독 권한

- `/topic/rooms/{roomId}/presence` 구독 시 서버는 STOMP principal의 `memberId`를 확인한다.
- 해당 `memberId`가 `roomId`의 방 멤버이면 구독을 허용한다.
- 방 멤버가 아니면 구독을 거부한다.
- 기존 `/topic/rooms/{roomId}/bingo-progress`, `/topic/rooms/{roomId}/battle-progress`, `/user/queue/battle` 구독 흐름은 이 검증 대상이 아니다.

## 이벤트 타입

### JOINED

해당 멤버가 이 방에서 처음 online 상태가 되었을 때 전송된다.

```json
{
  "type": "JOINED",
  "roomId": 10,
  "memberId": 1,
  "onlineCount": 2,
  "onlineMembers": [
    {
      "memberId": 1,
      "nickname": "산책러"
    },
    {
      "memberId": 2,
      "nickname": "친구"
    }
  ]
}
```

### LEFT

해당 멤버의 마지막 presence 구독이 사라져 offline 상태가 되었을 때 전송된다.

```json
{
  "type": "LEFT",
  "roomId": 10,
  "memberId": 1,
  "onlineCount": 1,
  "onlineMembers": [
    {
      "memberId": 2,
      "nickname": "친구"
    }
  ]
}
```

### SYNC

이미 online 상태인 멤버가 같은 방 Presence를 추가로 구독했을 때 전송된다.

대표적인 예시는 같은 사용자가 같은 방을 여러 탭이나 여러 기기에서 여는 경우이다. 이때 접속자 수는 중복으로 늘어나지 않는다.

```json
{
  "type": "SYNC",
  "roomId": 10,
  "memberId": 1,
  "onlineCount": 1,
  "onlineMembers": [
    {
      "memberId": 1,
      "nickname": "산책러"
    }
  ]
}
```

## Payload 필드

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | string | Presence 이벤트 타입. `JOINED`, `LEFT`, `SYNC` 중 하나 |
| `roomId` | number | Presence 이벤트가 발생한 방 ID |
| `memberId` | number | 입장, 퇴장, 동기화 이벤트의 대상 회원 ID |
| `onlineCount` | number | 현재 접속 중인 방 멤버 수 |
| `onlineMembers` | array | 현재 접속 중인 방 멤버 목록 전체 스냅샷 |
| `onlineMembers[].memberId` | number | 접속 중인 회원 ID |
| `onlineMembers[].nickname` | string | 접속 중인 회원 닉네임 |

프론트는 `JOINED`, `LEFT`, `SYNC` 타입별로 로컬 목록을 직접 증감 계산하지 말고, 항상 `onlineMembers` 스냅샷으로 화면을 갱신한다.

## 정상 이탈과 비정상 이탈

### 정상 이탈

방 화면을 떠날 때 프론트가 presence 구독을 해제한다.

```text
UNSUBSCRIBE /topic/rooms/{roomId}/presence
```

서버는 해당 구독을 제거한다. 같은 사용자의 다른 탭이나 기기 구독이 남아 있지 않으면 `LEFT` 이벤트를 전송한다.

### 비정상 이탈

브라우저 종료, 새로고침, 네트워크 끊김 등으로 WebSocket 세션이 끊기면 서버가 해당 세션의 모든 presence 구독을 제거한다.

마지막 구독이 사라진 방에 대해서만 `LEFT` 이벤트를 전송한다.

## 다중 탭과 다중 기기

- 같은 회원이 같은 방 Presence를 여러 번 구독해도 `onlineMembers`에는 한 번만 포함된다.
- 하나의 탭만 닫히고 다른 탭이 남아 있으면 `LEFT` 이벤트는 전송되지 않는다.
- 해당 회원의 마지막 구독이 사라질 때만 `LEFT` 이벤트가 전송된다.

## 협동 모드와 배틀 모드

- 협동 모드와 배틀 모드 모두 방 화면 기준으로 동일하게 `/topic/rooms/{roomId}/presence`를 구독하면 된다.
- 배틀 초대 대기 중에는 아직 방 멤버가 아닌 사용자가 있을 수 있으므로 presence 구독 대상이 아니다.
- 배틀 invitee는 초대 수락으로 방 멤버가 된 뒤 방 화면에서 presence 구독을 수행한다.

## 복구 시나리오

WebSocket 이벤트를 놓친 경우 프론트는 방 화면 재진입 시 다시 presence topic을 구독한다.

서버는 재구독 시 `JOINED` 또는 `SYNC` 이벤트와 함께 현재 `onlineMembers` 스냅샷을 내려주므로, 프론트는 이 값으로 접속자 목록을 복구할 수 있다.

## 제한 사항

- Presence 정보는 서버 메모리에만 저장된다.
- 서버가 재시작되면 접속 목록은 초기화된다.
- 단일 서버와 Spring simple broker 구조를 전제로 한다.
- 다중 서버로 확장할 경우 Redis 등 외부 presence 저장소와 브로커 연동이 별도로 필요하다.
