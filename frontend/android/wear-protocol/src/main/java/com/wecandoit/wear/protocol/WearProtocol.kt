package com.wecandoit.wear.protocol

/**
 * 폰 앱과 워치 앱이 주고받는 Data Layer 규약.
 *
 * 두 모듈(:app, :wear)이 이 디렉터리를 소스로 같이 컴파일한다(각 build.gradle의
 * sourceSets.srcDirs). 경로나 키를 한쪽에서만 고쳐서 조용히 안 맞는 일을 막으려는
 * 것이라, 여기 있는 값은 반드시 양쪽에서 이 상수로만 쓴다.
 *
 * 상태(폰 -> 워치)는 DataClient로 보낸다. 마지막 값이 Data Layer에 남아 있어서
 * 폰 앱이 죽어 있어도 워치가 켜질 때 직전 화면을 그릴 수 있다. 반대로 명령
 * (워치 -> 폰)은 MessageClient로 보낸다. 남으면 안 되는 1회성 동작이기 때문이다.
 */
object WearProtocol {

  /**
   * 워치 앱이 선언하는 capability 이름. 폰은 이걸로 "우리 워치 앱이 깔린 채
   * 닿는지"를 판단한다 — 연결된 노드를 그냥 세면, 우리 앱이 없는 페어링된
   * 기기까지 연결로 쳐서 받을 곳도 없는데 계속 상태를 밀게 된다.
   *
   * 워치 쪽 선언은 wear/src/main/res/values/wear.xml에 있다. XML이라 이 상수를
   * 참조할 수 없어 거기만 문자열이고, 둘이 어긋나면 폰이 워치를 영영 못 찾는다.
   */
  const val CAPABILITY_WATCH_APP = "wecandoit_watch_app"

  /** 폰 -> 워치. 캐릭터 이미지를 뺀 나머지 상태 전부. */
  const val PATH_STATE = "/wecandoit/state"

  /** 폰 -> 워치. 합성된 캐릭터 PNG. 상태와 갱신 주기가 크게 달라 따로 보낸다. */
  const val PATH_CHARACTER = "/wecandoit/character"

  /** 워치 -> 폰이 보내는 모든 명령의 공통 접두사. */
  const val PATH_COMMAND_PREFIX = "/wecandoit/command"

  /** 워치 -> 폰. 페이로드는 방 ID(UTF-8 10진 문자열). */
  const val PATH_COMMAND_START_WALK = "$PATH_COMMAND_PREFIX/start-walk"

  /** 워치 -> 폰. 페이로드 없음. */
  const val PATH_COMMAND_END_WALK = "$PATH_COMMAND_PREFIX/end-walk"

  /** 워치 -> 폰. 페이로드 없음. 워치 앱을 열었을 때 최신 상태를 다시 밀어달라는 요청. */
  const val PATH_COMMAND_REQUEST_SYNC = "$PATH_COMMAND_PREFIX/request-sync"

  // --- PATH_STATE DataMap ---

  /**
   * 내용이 같으면 DataClient가 변경으로 치지 않아 워치가 갱신을 못 받는다.
   * 폰이 보낼 때마다 값이 달라지도록 넣는 타임스탬프다.
   */
  const val KEY_UPDATED_AT = "updatedAt"
  const val KEY_NICKNAME = "nickname"

  /** 오늘 누적치(폰의 홈 화면과 같은 값). 아래 KEY_STEPS 계열을 담은 DataMap. */
  const val KEY_TODAY = "today"

  /** 워치에서 고를 수 있는 산책방 목록(DataMap 배열). */
  const val KEY_ROOMS = "rooms"

  /** 진행 중인 산책. 없으면 키 자체가 빠진다. */
  const val KEY_SESSION = "session"

  // KEY_TODAY / KEY_SESSION 안에서 공통으로 쓰는 수치 키.
  const val KEY_STEPS = "steps"
  const val KEY_DISTANCE_METERS = "distanceMeters"
  const val KEY_CALORIES = "calories"

  /** KEY_TODAY 전용. 0이면 목표가 없다는 뜻이라 워치가 진행률을 안 그린다. */
  const val KEY_GOAL_STEPS = "goalSteps"

  // rooms[] 원소.
  const val KEY_ROOM_ID = "roomId"
  const val KEY_ROOM_NAME = "name"

  /** RoomDetailResponse.mode와 같은 값('SINGLE' | 'COOPERATE' | 'BATTLE'). */
  const val KEY_ROOM_MODE = "mode"
  const val KEY_ROOM_MEMBER_COUNT = "memberCount"
  const val KEY_ROOM_COMPLETED_MISSIONS = "completedMissionCount"
  const val KEY_ROOM_TOTAL_MISSIONS = "totalMissionCount"

  /**
   * false면 워치에서 시작할 수 없다(빙고판 갱신 대기 등). 워치에는 판을 새로
   * 만드는 UI가 없어서, 폰에서 해결해야 하는 방은 이유만 보여주고 막는다.
   */
  const val KEY_ROOM_STARTABLE = "startable"
  const val KEY_ROOM_BLOCKED_REASON = "blockedReason"

  // session.
  const val KEY_SESSION_ROOM_NAME = "roomName"

  /** 시작 카운트다운이 끝나 경과 시간이 실제로 세지고 있는지. */
  const val KEY_SESSION_STARTED = "started"
  const val KEY_SESSION_PAUSED = "paused"

  /**
   * 폰이 보낸 시점의 경과 초. 워치는 이 값을 받은 순간부터 자기 시계로 이어서
   * 센다(폰이 1초마다 DataItem을 밀면 너무 잦고, 폰/워치 벽시계를 맞춰 쓰면
   * 시계 오차만큼 어긋난다).
   */
  const val KEY_SESSION_ELAPSED_SECONDS = "elapsedSeconds"

  // --- PATH_CHARACTER DataMap ---

  /** 합성된 캐릭터 PNG(Asset). */
  const val ASSET_CHARACTER_IMAGE = "image"
}
