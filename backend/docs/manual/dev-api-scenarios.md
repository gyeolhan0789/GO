# Dev 전체 API 시나리오 데이터

이 문서는 dev 데이터베이스에 적재되는 고정 테스트 데이터를 설명합니다.
시딩은 dev DB 서버의 프로시저가 담당하며, Jenkins CD 파이프라인은 더 이상
이를 관리하지 않습니다.

## 계정

관리자 비밀번호는 `DevAdmin1!`이며 모든 일반 사용자 비밀번호는
`DevUser1!`입니다.

| 회원 ID | 이메일 | 용도 |
| ---: | --- | --- |
| 1000 | `admin-dev@wecandoit.local` | 관리자 API |
| 1001 | `host-dev@wecandoit.local` | 공유방 호스트 및 상점 테스트 |
| 1002 | `coop-friend1-dev@wecandoit.local` | 공유방 참여자 |
| 1003 | `coop-friend2-dev@wecandoit.local` | 공유방 참여자 |
| 1004 | `coop-friend3-dev@wecandoit.local` | 공유방 참여자 |
| 1005 | `requester-dev@wecandoit.local` | 친구 및 방 요청 테스트 |
| 1006 | `invitee-dev@wecandoit.local` | 요청 수신 테스트 |
| 1007 | `outsider-dev@wecandoit.local` | 권한 없음 및 캐시 부족 테스트 |
| 1008 | `fresh-dev@wecandoit.local` | 신규 방 생성 테스트 |
| 1009 | `single-dev@wecandoit.local` | 기존 SINGLE 방 테스트 |
| 1010 | `battle-host-dev@wecandoit.local` | BATTLE 호스트 |
| 1011 | `battle-user-dev@wecandoit.local` | BATTLE 상대 참여자 |
| 1012 | `remove-friend-dev@wecandoit.local` | 친구 삭제 테스트 |

로그인 요청:

```json
{
  "email": "host-dev@wecandoit.local",
  "password": "DevUser1!"
}
```

응답으로 받은 access token을 `Authorization: Bearer {accessToken}`으로 사용합니다.

## 고정 ID

### 활성 방과 게임 회차

| 방 | 게임 | 빙고판 | 시나리오 |
| ---: | ---: | ---: | --- |
| 4001 | 5001 | 7001 | 4인 활성 COOPERATE |
| 4002 | 5002 | 7002 | 중간 참여 테스트용 2인 COOPERATE |
| 4003 | 5003 | 7003 | 시작 후 8일이 지난 COOPERATE |
| 4004 | 5004 | 7004 | 목표를 조기 달성한 COOPERATE |
| 4005 | 5005 | 7005 | PENDING 셀 8041이 있는 만료 COOPERATE |
| 4006 | 5006 | 7006 | 기존 활성 SINGLE |
| 4007 | - | - | 요청 9002 수락 전 1인 BATTLE 대기방 |
| 4008 | 5007 | 7007/7008 | 개인 빙고판이 생성된 활성 BATTLE |

방 4001에는 RoomMember와 GameParticipant가 각각 4명 있습니다. 회원은
1001, 1002, 1003, 1004이며 다섯 번째 사용자를 초대하면 정원 초과로 거부됩니다.

### 종료된 게임 회차

| 방 | 게임 | 빙고판 | 시나리오 |
| ---: | ---: | ---: | --- |
| 4010 | 5101 | 7101/7102 | 재대결 가능한 종료 BATTLE |
| 4011 | 5102 | 7103 | 성공한 4인 COOPERATE 결과 |
| 4012 | 5103 | 7104 | 실패 후 만료된 COOPERATE 결과 |

게임 5102의 회원별 완료 미션 기여도는 1001/1002/1003/1004 순서로
`3/2/1/0`입니다.

### 요청과 카탈로그

| ID | 용도 |
| ---: | --- |
| 친구 요청 3101 | 1005가 1006에게 보낸 요청으로 수락 또는 거절 가능 |
| 친구 요청 3102 | 1006이 1007에게 보낸 요청으로 취소 가능 |
| 친구 3006 | 회원 1001과 1012의 친구 관계 |
| 방 요청 9001 | 1001이 1005를 방 4002에 초대 |
| 방 요청 9002 | 1010이 1011을 방 4007에 초대 |
| 방 요청 9003 | 1006이 거절할 초대 |
| 방 요청 9004 | 방 4001에서 1001이 취소할 초대 |
| 아이템 2101-2106 | 판매 중인 상점 아이템 |
| 아이템 2107 | 캐시 부족 테스트용 고가 아이템 |
| 아이템 2108 | 판매 중지 아이템 |
| 미션 2001-2025 | 최대 5x5 빙고판 생성용 미션 풀 |

## 권장 테스트 순서

조회 시나리오를 먼저 실행하고 데이터를 변경하거나 방을 종료하는 API는 나중에 실행합니다.

### 1. 인증과 회원

| API | 실행 사용자 | 기대 결과 |
| --- | --- | --- |
| `POST /auth/signup` | 비로그인 | 고유 이메일 가입 성공, 같은 이메일 재요청 시 중복 오류 |
| `POST /auth/login` | 관리자/일반 사용자 | 시드 비밀번호 로그인 성공, 잘못된 비밀번호 실패 |
| `POST /auth/reissue` | 로그인 사용자 | 응답받은 refresh token으로 토큰 재발급 |
| `POST /auth/logout` | 로그인 사용자 | 해당 계정의 다른 시나리오가 끝난 뒤 실행 |
| `POST /auth/oauth/google` | 외부 연동 | 기존 회원은 로그인, 신규 회원은 `SIGNUP_REQUIRED`와 가입 토큰 반환 |
| `POST /auth/oauth/kakao` | 외부 연동 | 기존 회원은 로그인, 신규 회원은 `SIGNUP_REQUIRED`와 가입 토큰 반환 |
| `POST /auth/oauth/google/signup` | 외부 연동 | Google 가입 토큰과 성별로 가입 완료 |
| `POST /auth/oauth/kakao/signup` | 외부 연동 | Kakao 가입 토큰과 성별로 가입 완료 |
| `GET /members/me` | 1001 | 호스트 프로필과 캐시 반환 |
| `GET /members/search?keyword=dev-coop` | 1001 | 협력방 사용자 3명 검색 |
| `PATCH /members/me` | 1008 | 닉네임·지역·성별 변경, 후반에 실행 |
| `PATCH /members/password` | 1008 | `DevUser1!`에서 비밀번호 변경, 마지막에 실행 |
| `PATCH /members/me/fcm-token` | 1008 | 토큰 저장, 실제 발송은 FCM 연동 필요 |

회원가입 요청 예시:

```json
{
  "email": "signup-scenario@wecandoit.local",
  "password": "DevUser2!",
  "nickname": "signup-scenario",
  "region": "SEOUL",
  "gender": "MALE"
}
```

OAuth 검증 요청 예시:

```json
{
  "idToken": "provider-id-token"
}
```

OAuth 가입 완료 요청 예시:

```json
{
  "signupToken": "verify-response-signup-token",
  "gender": "MALE"
}
```

### 2. 친구

| API | 실행 사용자 | 기대 결과 |
| --- | --- | --- |
| `GET /friends` | 1001 | 회원 1002-1005와 1012 포함 |
| `POST /friend-requests` | 1008 | 1007에게 새로운 친구 요청 전송 |
| `GET /friend-requests` | 1006 | 받은 요청 3101 포함 |
| `GET /friend-requests/sent` | 1006 | 보낸 요청 3102 포함 |
| `PATCH /friend-requests/3101/accept` | 1006 | 1005와 친구 관계 생성 |
| `PATCH /friend-requests/3101/reject` | 1006 | 초기화 후 수락 대신 선택 가능한 거절 시나리오 |
| `DELETE /friend-requests/3102` | 1006 | 보낸 요청 취소 |
| `DELETE /friends/1012` | 1001 | 삭제 테스트용 친구 관계만 삭제 |

친구 요청 예시:

```json
{
  "inviteeId": 1007
}
```

### 3. 방과 초대

| API | 실행 사용자 | 기대 결과 |
| --- | --- | --- |
| `GET /rooms` | 1001 | 호스트가 참여한 모든 활성 방 반환 |
| `GET /rooms?mode=COOPERATE` | 1001 | 협력방만 반환 |
| `GET /rooms/4001` | 1001 | 4인 협력방 상세 반환 |
| `GET /rooms/4001/members` | 1001 | 참여자 4명 반환 |
| `POST /rooms` | 1008 | 새 방과 첫 공유 게임 회차 생성 |
| `POST /rooms` | 1009 | SINGLE 요청 시 기존 방 4006 반환 |
| `PATCH /rooms/4002` | 1001 | 호스트가 방 이름 변경 |
| `PATCH /rooms/4002` | 1002 | 일반 참여자는 403 |
| `GET /rooms/requests/received` | 1005 | 요청 9001 포함 |
| `GET /rooms/requests/sent` | 1001 | 요청 9001/9003/9004 포함 |
| `POST /rooms/4001/requests` | 1001 | 정원이 가득 차 있어 모든 초대 실패 |
| `PATCH /rooms/4002/requests/9001/accept` | 1005 | RoomMember와 GameParticipant 추가 |
| `PATCH /rooms/4002/requests/9003/reject` | 1006 | 대기 중인 초대 거절 |
| `PATCH /rooms/4001/requests/9004/cancel` | 1001 | 대기 중인 초대 취소 |
| `PATCH /rooms/4007/requests/9002/accept` | 1011 | 첫 BATTLE 게임 회차 시작 |
| `DELETE /rooms/4002/members/me` | 1002 | RoomMember 삭제, GameParticipant 유지 |
| `DELETE /rooms/4002` | 1001 | 호스트가 방 종료, 마지막에 실행 |

방 생성 요청 예시:

```json
{
  "name": "새 협력방",
  "mode": "COOPERATE",
  "targetStepCount": 8000,
  "boardSize": 3
}
```

방 초대 요청 예시:

```json
{
  "inviteeId": 1005
}
```

### 4. 빙고와 게임 결과

| API | 실행 사용자 | 기대 결과 |
| --- | --- | --- |
| `GET /rooms/4001/bingo-boards/active` | 1001-1004 | 모든 참여자가 공유 빙고판 7001 조회 |
| `GET /rooms/4003/bingo-boards/active` | 1001 | `renewalRequired=true`, `canRenew=true` |
| `GET /rooms/4003/bingo-boards/active` | 1003 | `renewalRequired=true`, `canRenew=false` |
| `GET /rooms/4004/bingo-boards/active` | 1001 | `completed=true`, `canRenew=true` |
| `GET /rooms/4008/bingo-boards/active` | 1010/1011 | 각 참여자의 개인 빙고판 반환 |
| `POST /rooms/4002/bingo-boards/cells/8012/submit` | 1001 | AI 검증 흐름 실행 |
| `POST /rooms/4003/bingo-boards/renewal` | 1001 | 기존 회차 만료 및 새 회차 생성 |
| `POST /rooms/4004/bingo-boards/renewal` | 1001 | 조기 성공 회차 종료 및 새 회차 생성 |
| `POST /rooms/4005/bingo-boards/renewal` | 1001 | 셀 8041이 PENDING이므로 실패 |
| `POST /rooms/4003/bingo-boards/renewal` | 1003 | 호스트가 아니므로 403 |
| `POST /rooms/4010/battles/rematch` | 1010 | 새 BATTLE 회차 생성 |
| `GET /game-results` | 1001 | 성공·실패 공유 게임 결과 포함 |
| `GET /game-results/5102` | 1001-1004 | 결과 참여자 4명 반환 |
| `GET /game-results/5101` | 1010/1011 | 승자와 패자 반환 |
| `GET /game-results/5102` | 1007 | 결과 미참여자이므로 403 |

빙고 셀 제출은 `multipart/form-data`로 이미지 파일을 전송합니다.

```bash
curl -X POST \
  -H "Authorization: Bearer {accessToken}" \
  -F "image=@mission.jpg" \
  "http://localhost:8080/rooms/4002/bingo-boards/cells/8012/submit"
```

이미지는 PNG 또는 JPEG 형식이며 최대 크기는 5MB입니다. 최종 APPROVED 또는
REJECTED 결과는 실제 AI 서버 응답에 따라 달라집니다.

빙고판 갱신 요청 예시:

```json
{
  "boardSize": 3,
  "targetStepCount": 10000
}
```

### 5. 운동 기록, 랭킹, 캐시와 알림

| API | 실행 사용자 | 기대 결과 |
| --- | --- | --- |
| `GET /histories?period=DAY&date={today}` | 1001 | `{today}`에 오늘 날짜를 입력하면 오늘 운동 기록 반환 |
| `GET /histories?period=WEEK&date={today}` | 1001 | `{today}`에 오늘 날짜를 입력하면 이번 주 합계 반환 |
| `GET /histories?period=MONTH&date={today}` | 1001 | `{today}`에 오늘 날짜를 입력하면 이번 달 합계 반환 |
| `POST /histories` | 1001 | 오늘 기록 누적 및 걸음 목표 보상 판정 |
| `GET /rankings` | 1001 | 오늘 날짜의 시드 기록으로 랭킹 반환 |
| `GET /rankings/friends` | 1001 | 협력방 친구 포함 |
| `GET /members/cash` | 1001 | 시드 캐시 잔액 반환 |
| `GET /members/cash-histories` | 1001 | 캐시 내역 유형 4종 반환 |
| `GET /notifications` | 1001 | 읽음·안 읽음 알림 반환 |
| `PATCH /notifications/3401/read` | 1001 | 본인 알림 읽음 처리 |
| `PATCH /notifications/3407/read` | 1001 | 1002의 알림이므로 실패 |

운동 기록 요청 예시:

```json
{
  "historyDate": "현재-yyyy-MM-dd",
  "step": 500,
  "distance": 350,
  "calories": 20
}
```

### 6. 상점과 캐릭터

| API | 실행 사용자 | 기대 결과 |
| --- | --- | --- |
| `GET /shop/items` | 1001 | 아이템 2108을 제외한 판매 중 아이템 반환 |
| `GET /shop/items?category=HAT` | 1001 | HAT 아이템만 반환 |
| `POST /shop/items/2106/purchase` | 1001 | 구매 성공 |
| `POST /shop/items/2101/purchase` | 1001 | 이미 보유한 아이템 오류 |
| `POST /shop/items/2107/purchase` | 1007 | 캐시 부족 오류 |
| `POST /shop/items/2108/purchase` | 1001 | 판매 중지 오류 |
| `GET /members/items` | 1001 | 아이템 2101-2103 반환 |
| `GET /members/items?category=HAT` | 1001 | 아이템 2101 반환 |
| `GET /members/character` | 1001 | 기본 이미지와 장착 아이템 반환 |
| `PUT /character-items` | 1001 | 보유한 member-item ID로 장착 상태 변경 |

아이템 장착 요청 예시:

```json
{
  "memberItemIds": [3501, 3502, 3503]
}
```

### 7. 관리자

회원 1000으로 로그인합니다. 일반 사용자 토큰으로 관리자 API를 한 번 호출해
403 응답도 확인합니다.

| API | 기대 결과 |
| --- | --- |
| `GET /admin/missions` | 시드 미션 25개 반환 |
| `POST /admin/missions/images` | PNG 또는 JPEG 업로드 |
| `POST /admin/missions` | 업로드된 이미지 URL로 미션 생성 |
| `GET /admin/items` | 판매 중·판매 중지 아이템 반환 |
| `GET /admin/items/2101` | 시드 아이템 상세 반환 |
| `POST /admin/items` | multipart 아이템 생성 |
| `PUT /admin/items/2101` | 선택적 이미지를 포함한 multipart 수정 |
| `DELETE /admin/items/2106` | 판매 중지, 마지막에 실행 |
| `GET /admin/character-assets` | MALE·FEMALE 에셋 반환 |
| `GET /admin/character-assets/MALE` | 남성 기본 에셋 반환 |
| `PUT /admin/character-assets/MALE` | PNG/JPEG 이미지 교체 |

관리자 미션 생성 요청 예시:

```json
{
  "missionImageUrl": "/uploads/missions/example.png",
  "type": "OBJECT",
  "title": "관리자 생성 미션",
  "detail": "관리자 API 검증용 미션입니다.",
  "decisionCondition": {
    "type": "OBJECT",
    "value": "blue"
  }
}
```

### 8. 산책 세션 기록

회원 1001과 1002로 로그인해 산책 세션 목록과 상세를 확인합니다.

| 세션 ID | 회원 | 방 | 초기 보드 | 시나리오 |
| ---: | ---: | ---: | ---: | --- |
| 10001 | 1001 | 4004 | 7004 | 활성 협력방에서 승인 미션 5개를 달성한 세션 |
| 10002 | 1002 | 4001 | 7001 | 빙고 성과 없이 신체활동만 기록한 세션 |
| 10003 | 1001 | 4011 | 7103 | 닫힌 방에서 승인 미션 3개를 달성한 과거 세션 |

| API | 기대 결과 |
| --- | --- |
| `GET /walk-sessions?page=0&size=10` | 로그인 회원 소유 전체 세션을 종료 시각 내림차순으로 반환 |
| `GET /walk-sessions?roomId=4004&page=0&size=10` | 로그인 회원의 방 4004 세션만 반환 |
| `GET /walk-sessions/10001` | 보드 7004 전체 배치와 세션 달성 셀 5개 반환 |
| `GET /walk-sessions/10002` | 보드 7001 전체 배치와 달성 셀 0개 반환 |
| `GET /walk-sessions/10003` | 닫힌 방의 과거 세션과 보드 7103 반환 |
| 다른 회원의 세션 상세 조회 | 403 반환 |

산책 종료 요청 예시:

```json
{
  "clientSessionKey": "44444444-4444-4444-4444-444444444444",
  "roomId": 4001,
  "bingoBoardId": 7001,
  "startedAt": "2026-08-03T10:00:00+09:00",
  "endedAt": "2026-08-03T10:42:15+09:00",
  "step": 4832,
  "distance": 3382,
  "calories": 214
}
```

같은 회원이 같은 `clientSessionKey`로 다시 요청하면 기존 세션을 200으로 반환하며,
일별 신체활동과 목표 걸음 보상은 다시 누적하지 않습니다. 산책 중 미션 제출 시에는
기존 multipart 요청에 `clientSessionKey` 폼 필드를 선택적으로 추가합니다.

## 검증 SQL

```sql
SELECT COUNT(*) AS member_count FROM member;
SELECT COUNT(*) AS mission_count FROM missions;

SELECT COUNT(*) AS room_member_count
FROM room_members
WHERE room_id = 4001;

SELECT COUNT(*) AS game_participant_count
FROM game_participants
WHERE game_id = 5001;

SELECT COUNT(*) AS shared_board_count
FROM bingo_boards
WHERE game_id = 5001
  AND board_type = 'SHARED';

SELECT member_id, completed_mission_count, reward_cash, result
FROM game_result_participants
WHERE game_id = 5102
ORDER BY member_id;

SELECT id, member_id, room_id, client_session_key, ended_at
FROM walk_sessions
ORDER BY ended_at DESC, id DESC;

SELECT walk_session_id, bingo_board_id, bingo_cell_id, achieved_at
FROM walk_session_bingo_achievements
ORDER BY walk_session_id, bingo_cell_id;
```

기대 개수는 회원 13명, 미션 25개, RoomMember 4명,
GameParticipant 4명, 공유 빙고판 1개, 산책 세션 3개, 산책 빙고 성과 8개입니다.
