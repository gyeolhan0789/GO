package com.wecandoit.wear.data

import android.os.SystemClock
import com.google.android.gms.wearable.DataMap
import com.wecandoit.wear.protocol.WearProtocol

/** 오늘 누적치. 폰 홈 화면이 보여주는 값과 같다. */
data class TodayStats(
  val steps: Int,
  val distanceMeters: Int,
  val calories: Int,
  /** 0이면 목표가 없다는 뜻이라 진행률을 그리지 않는다. */
  val goalSteps: Int,
) {
  /** 목표가 없으면 null. 있으면 0f..1f. */
  val goalProgress: Float?
    get() = if (goalSteps <= 0) null else (steps.toFloat() / goalSteps).coerceIn(0f, 1f)

  companion object {
    val EMPTY = TodayStats(steps = 0, distanceMeters = 0, calories = 0, goalSteps = 0)
  }
}

/** 워치에서 고를 수 있는 산책방 한 개. */
data class WalkRoom(
  val roomId: Long,
  val name: String,
  val mode: String,
  val memberCount: Int,
  val completedMissions: Int,
  val totalMissions: Int,
  /** false면 폰에서 먼저 처리해야 하는 방이라 시작 버튼을 막는다. */
  val startable: Boolean,
  val blockedReason: String?,
)

/** 진행 중인 산책. 폰의 walkSessionStore를 그대로 옮겨온 값이다. */
data class WalkSession(
  val roomId: Long,
  val roomName: String,
  /** 시작 카운트다운이 끝나 경과 시간이 실제로 세지고 있는지. */
  val started: Boolean,
  val paused: Boolean,
  /** 폰이 이 상태를 보낸 시점의 경과 초. 이후는 워치가 자기 시계로 이어 센다. */
  val elapsedSecondsAtSync: Int,
  val steps: Int,
  val distanceMeters: Int,
  val calories: Int,
)

/**
 * 폰이 마지막으로 보내온 상태 전체.
 *
 * 폰 앱이 꺼져 있어도 Data Layer가 마지막 DataItem을 워치에 들고 있어서, 워치
 * 앱을 다시 열면 이 값이 곧바로 복구된다(그래서 첫 화면이 빈 채로 뜨지 않는다).
 */
data class PhoneState(
  val nickname: String,
  val today: TodayStats,
  val rooms: List<WalkRoom>,
  val session: WalkSession?,
  /**
   * 이 상태를 받은 시점의 SystemClock.elapsedRealtime(). 경과 시간을 워치에서
   * 이어 세는 기준이다. 폰과 워치의 벽시계를 맞춰 쓰면 시계 오차가 그대로
   * 경과 시간 오차가 되므로 부팅 후 경과 시간을 쓴다.
   */
  val receivedAtRealtime: Long,
) {
  /** 일시정지가 아니면 마지막 동기화 이후 흐른 만큼을 더해 지금 경과 초를 낸다. */
  fun currentElapsedSeconds(nowRealtime: Long = SystemClock.elapsedRealtime()): Int {
    val walk = session ?: return 0
    if (!walk.started || walk.paused) {
      return walk.elapsedSecondsAtSync
    }
    val sinceSync = ((nowRealtime - receivedAtRealtime) / 1000L).toInt().coerceAtLeast(0)
    return walk.elapsedSecondsAtSync + sinceSync
  }
}

/**
 * 폰이 보낸 DataMap을 화면이 쓰는 모양으로 바꾼다.
 *
 * 폰과 워치는 따로 설치·업데이트되므로 버전이 어긋날 수 있다. 없는 키는 전부
 * 기본값으로 떨어뜨려서, 폰이 새 필드를 먼저 보내도 워치가 죽지 않게 한다.
 */
fun DataMap.toPhoneState(receivedAtRealtime: Long): PhoneState {
  val today = getDataMap(WearProtocol.KEY_TODAY)
  val session = getDataMap(WearProtocol.KEY_SESSION)

  return PhoneState(
    nickname = getString(WearProtocol.KEY_NICKNAME).orEmpty(),
    today = today?.toTodayStats() ?: TodayStats.EMPTY,
    rooms = getDataMapArrayList(WearProtocol.KEY_ROOMS)
      ?.map { it.toWalkRoom() }
      .orEmpty(),
    session = session?.toWalkSession(),
    receivedAtRealtime = receivedAtRealtime,
  )
}

private fun DataMap.toTodayStats() = TodayStats(
  steps = getInt(WearProtocol.KEY_STEPS),
  distanceMeters = getInt(WearProtocol.KEY_DISTANCE_METERS),
  calories = getInt(WearProtocol.KEY_CALORIES),
  goalSteps = getInt(WearProtocol.KEY_GOAL_STEPS),
)

private fun DataMap.toWalkRoom() = WalkRoom(
  roomId = getLong(WearProtocol.KEY_ROOM_ID),
  name = getString(WearProtocol.KEY_ROOM_NAME).orEmpty(),
  mode = getString(WearProtocol.KEY_ROOM_MODE).orEmpty(),
  memberCount = getInt(WearProtocol.KEY_ROOM_MEMBER_COUNT),
  completedMissions = getInt(WearProtocol.KEY_ROOM_COMPLETED_MISSIONS),
  totalMissions = getInt(WearProtocol.KEY_ROOM_TOTAL_MISSIONS),
  // 키가 아예 없으면(구버전 폰) 막지 않는다. 시작을 못 하게 하는 쪽이 더 큰 고장이다.
  startable = if (containsKey(WearProtocol.KEY_ROOM_STARTABLE)) {
    getBoolean(WearProtocol.KEY_ROOM_STARTABLE)
  } else {
    true
  },
  blockedReason = getString(WearProtocol.KEY_ROOM_BLOCKED_REASON),
)

private fun DataMap.toWalkSession() = WalkSession(
  roomId = getLong(WearProtocol.KEY_ROOM_ID),
  roomName = getString(WearProtocol.KEY_SESSION_ROOM_NAME).orEmpty(),
  started = getBoolean(WearProtocol.KEY_SESSION_STARTED),
  paused = getBoolean(WearProtocol.KEY_SESSION_PAUSED),
  elapsedSecondsAtSync = getInt(WearProtocol.KEY_SESSION_ELAPSED_SECONDS),
  steps = getInt(WearProtocol.KEY_STEPS),
  distanceMeters = getInt(WearProtocol.KEY_DISTANCE_METERS),
  calories = getInt(WearProtocol.KEY_CALORIES),
)
