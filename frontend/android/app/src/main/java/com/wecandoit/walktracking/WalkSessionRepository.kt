package com.wecandoit.walktracking

import android.content.Context
import android.content.SharedPreferences
import java.io.File
import java.io.FileOutputStream
import org.json.JSONObject

private const val PREFS_NAME = "walk_tracking_prefs"

private const val KEY_SESSION_ID = "session_id"
private const val KEY_ROOM_ID = "room_id"
private const val KEY_STATUS = "status"
private const val KEY_STARTED_AT = "started_at"
private const val KEY_PAUSED_AT = "paused_at"
private const val KEY_PAUSED_MS = "paused_ms"
private const val KEY_BASELINE_STEPS = "baseline_steps"
private const val KEY_BASELINE_DISTANCE = "baseline_distance"
private const val KEY_BASELINE_CALORIES = "baseline_calories"
private const val KEY_LAST_RAW_STEPS = "last_raw_steps"
private const val KEY_LAST_RAW_DISTANCE = "last_raw_distance"
private const val KEY_LAST_RAW_CALORIES = "last_raw_calories"
private const val KEY_HEALTH_SOURCE = "health_source"
private const val KEY_GENDER = "gender"

private const val ROUTE_FILE_PREFIX = "walk_route_"
private const val ROUTE_FILE_SUFFIX = ".jsonl"

/**
 * 산책 세션의 영속화를 담당한다. 상태(작고 자주 안 바뀜)는 SharedPreferences에,
 * 경로 좌표(자주 추가됨)는 append-only 파일에 나눠 저장한다 — 좌표를 찍을 때마다
 * 전체 JSON을 다시 쓰는 방식은 피한다.
 */
class WalkSessionRepository(private val context: Context) {

  private val prefs: SharedPreferences by lazy {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  fun load(): WalkSessionState {
    val sessionId = prefs.getString(KEY_SESSION_ID, null) ?: return WalkSessionState()
    return WalkSessionState(
      sessionId = sessionId,
      roomId = prefs.getLong(KEY_ROOM_ID, -1L).takeIf { it >= 0 },
      status = runCatching { WalkStatus.valueOf(prefs.getString(KEY_STATUS, null) ?: "IDLE") }
        .getOrDefault(WalkStatus.IDLE),
      startedAt = prefs.getLong(KEY_STARTED_AT, -1L).takeIf { it >= 0 },
      pausedAt = prefs.getLong(KEY_PAUSED_AT, -1L).takeIf { it >= 0 },
      pausedMs = prefs.getLong(KEY_PAUSED_MS, 0L),
      baseline = HealthBaseline(
        steps = prefs.getFloat(KEY_BASELINE_STEPS, 0f).toDouble(),
        distanceMeters = prefs.getFloat(KEY_BASELINE_DISTANCE, 0f).toDouble(),
        calories = prefs.getFloat(KEY_BASELINE_CALORIES, 0f).toDouble(),
      ),
      lastRaw = HealthBaseline(
        steps = prefs.getFloat(KEY_LAST_RAW_STEPS, 0f).toDouble(),
        distanceMeters = prefs.getFloat(KEY_LAST_RAW_DISTANCE, 0f).toDouble(),
        calories = prefs.getFloat(KEY_LAST_RAW_CALORIES, 0f).toDouble(),
      ),
      healthSource = runCatching {
        HealthSource.valueOf(prefs.getString(KEY_HEALTH_SOURCE, null) ?: "NONE")
      }.getOrDefault(HealthSource.NONE),
      gender = prefs.getString(KEY_GENDER, null),
    )
  }

  fun save(state: WalkSessionState) {
    if (state.status == WalkStatus.IDLE) {
      clear()
      return
    }
    prefs.edit()
      .putString(KEY_SESSION_ID, state.sessionId)
      .putLong(KEY_ROOM_ID, state.roomId ?: -1L)
      .putString(KEY_STATUS, state.status.name)
      .putLong(KEY_STARTED_AT, state.startedAt ?: -1L)
      .putLong(KEY_PAUSED_AT, state.pausedAt ?: -1L)
      .putLong(KEY_PAUSED_MS, state.pausedMs)
      .putFloat(KEY_BASELINE_STEPS, state.baseline.steps.toFloat())
      .putFloat(KEY_BASELINE_DISTANCE, state.baseline.distanceMeters.toFloat())
      .putFloat(KEY_BASELINE_CALORIES, state.baseline.calories.toFloat())
      .putFloat(KEY_LAST_RAW_STEPS, state.lastRaw.steps.toFloat())
      .putFloat(KEY_LAST_RAW_DISTANCE, state.lastRaw.distanceMeters.toFloat())
      .putFloat(KEY_LAST_RAW_CALORIES, state.lastRaw.calories.toFloat())
      .putString(KEY_HEALTH_SOURCE, state.healthSource.name)
      .putString(KEY_GENDER, state.gender)
      .apply()
  }

  fun clear() {
    prefs.edit().clear().apply()
  }

  private fun routeFile(sessionId: String): File =
    File(context.filesDir, "$ROUTE_FILE_PREFIX$sessionId$ROUTE_FILE_SUFFIX")

  /** 좌표 1개를 파일 끝에 append하고 즉시 닫는다 — 프로세스가 갑자기 죽어도 이미
   * flush된 줄은 남는다. */
  fun appendRoutePoint(sessionId: String, point: RoutePoint) {
    val json = JSONObject().apply {
      put("lat", point.latitude)
      put("lon", point.longitude)
      put("t", point.timestamp)
    }
    FileOutputStream(routeFile(sessionId), true).use { stream ->
      stream.write((json.toString() + "\n").toByteArray(Charsets.UTF_8))
    }
  }

  fun readRoute(sessionId: String?): List<RoutePoint> {
    if (sessionId == null) return emptyList()
    val file = routeFile(sessionId)
    if (!file.exists()) return emptyList()
    return file.readLines(Charsets.UTF_8).mapNotNull { line ->
      if (line.isBlank()) return@mapNotNull null
      runCatching {
        val json = JSONObject(line)
        RoutePoint(json.getDouble("lat"), json.getDouble("lon"), json.getLong("t"))
      }.getOrNull()
    }
  }

  fun deleteRoute(sessionId: String?) {
    if (sessionId == null) return
    routeFile(sessionId).delete()
  }

  /** 새 세션 시작 시, 이전에 정리되지 못한 다른 세션의 경로 파일을 청소한다. */
  fun deleteOrphanRouteFiles(exceptSessionId: String?) {
    val dir = context.filesDir ?: return
    dir.listFiles { file ->
      file.name.startsWith(ROUTE_FILE_PREFIX) && file.name.endsWith(ROUTE_FILE_SUFFIX)
    }?.forEach { file ->
      val fileSessionId = file.name.removePrefix(ROUTE_FILE_PREFIX).removeSuffix(ROUTE_FILE_SUFFIX)
      if (fileSessionId != exceptSessionId) {
        file.delete()
      }
    }
  }
}
