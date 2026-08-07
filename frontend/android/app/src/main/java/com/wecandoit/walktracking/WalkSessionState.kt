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
  /** 앱이 최근 목록에서 스와이프돼 지워져서, 이번 산책이 그때까지의 기록으로
   * 자동 종료돼야 한다는 뜻. JS는 이 값이 true면 다음에 뜰 때 확인 없이 바로
   * 완료 처리한다(endRequested와 같은 경로). */
  val pendingAutoComplete: Boolean,
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
  /** onTaskRemoved에서 세웠다가, 정상 종료(stop)로 상태가 새로 만들어지면
   * 기본값(false)으로 돌아간다 — 별도로 내리는 코드가 없어도 된다. */
  var pendingAutoComplete: Boolean = false,
) {
  /**
   * 새로 읽은 값을 반영한다.
   *
   * 걸음 소스는 둘 다 "오늘 누적"이라 자정에 0으로 돌아간다(삼성헬스 readToday, 걸음
   * 센서의 날짜별 기준값). 재부팅도 같은 모양이다. 값이 직전보다 작아지면 그 리셋이
   * 일어난 것이므로 기준값을 직전 값만큼 끌어내린다 — 그래야 (lastRaw - baseline)이
   * 지금까지 센 몫에 이어서 쌓인다.
   *
   * 안 하면 lastRaw가 baseline보다 작아진 채로 남아 toSnapshot의 coerceAtLeast(0.0)에
   * 걸린다. 자정을 넘긴 산책이 끝날 때까지 0으로 기록되는 게 그 증상이었다.
   */
  fun withReading(raw: HealthBaseline, source: HealthSource): WalkSessionState =
    copy(
      baseline = if (raw.steps >= lastRaw.steps) {
        baseline
      } else {
        HealthBaseline(
          steps = baseline.steps - lastRaw.steps,
          distanceMeters = baseline.distanceMeters - lastRaw.distanceMeters,
          calories = baseline.calories - lastRaw.calories,
        )
      },
      lastRaw = raw,
      healthSource = source,
    )

  /**
   * 재개 시점의 값을 반영한다. 일시정지 중에 늘어난 몫만큼 기준값을 밀어 세션 기록에서
   * 제외한다.
   *
   * 차이를 0으로 자르지 않는다. 일시정지 중에 자정이 지나면 차이가 음수인데, 그게 정확히
   * 필요한 이동량이다 — 기준값을 그만큼 내려야 지금까지 센 몫이 그대로 유지된다.
   */
  fun resumedWith(raw: HealthBaseline, source: HealthSource): WalkSessionState =
    copy(
      baseline = HealthBaseline(
        steps = baseline.steps + (raw.steps - lastRaw.steps),
        distanceMeters = baseline.distanceMeters + (raw.distanceMeters - lastRaw.distanceMeters),
        calories = baseline.calories + (raw.calories - lastRaw.calories),
      ),
      lastRaw = raw,
      healthSource = source,
    )

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
      pendingAutoComplete = pendingAutoComplete,
    )
  }
}
