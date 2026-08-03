package com.wecandoit.walktracking

enum class WalkStatus {
  IDLE,
  RUNNING,
  PAUSED,
}

enum class HealthSource {
  NONE,
  SAMSUNG_HEALTH,
  STEP_SENSOR,
}

data class HealthBaseline(
  var steps: Double = 0.0,
  var distanceMeters: Double = 0.0,
  var calories: Double = 0.0,
)

data class RoutePoint(
  val latitude: Double,
  val longitude: Double,
  val timestamp: Long,
)

data class WalkSessionSnapshot(
  val sessionId: String?,
  val roomId: Long?,
  val status: WalkStatus,
  val startedAt: Long?,
  val activeElapsedMs: Long,
  val steps: Double,
  val distanceMeters: Double,
  val calories: Double,
)

/**
 * 산책 세션 상태. WalkForegroundService가 이 값의 유일한 소유자이며,
 * WalkSessionRepository를 통해 SharedPreferences에 영속화된다.
 */
data class WalkSessionState(
  var sessionId: String? = null,
  var roomId: Long? = null,
  var status: WalkStatus = WalkStatus.IDLE,
  var startedAt: Long? = null,
  var pausedAt: Long? = null,
  var pausedMs: Long = 0L,
  var baseline: HealthBaseline = HealthBaseline(),
  var lastRaw: HealthBaseline = HealthBaseline(),
  var healthSource: HealthSource = HealthSource.NONE,
  var gender: String? = null,
) {
  fun toSnapshot(now: Long): WalkSessionSnapshot {
    val activeElapsedMs = if (startedAt == null) {
      0L
    } else {
      val pausedTotal = pausedMs + (pausedAt?.let { now - it } ?: 0L)
      (now - startedAt!! - pausedTotal).coerceAtLeast(0L)
    }
    return WalkSessionSnapshot(
      sessionId = sessionId,
      roomId = roomId,
      status = status,
      startedAt = startedAt,
      activeElapsedMs = activeElapsedMs,
      steps = (lastRaw.steps - baseline.steps).coerceAtLeast(0.0),
      distanceMeters = (lastRaw.distanceMeters - baseline.distanceMeters).coerceAtLeast(0.0),
      calories = (lastRaw.calories - baseline.calories).coerceAtLeast(0.0),
    )
  }
}
