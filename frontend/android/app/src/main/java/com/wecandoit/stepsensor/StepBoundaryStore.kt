package com.wecandoit.stepsensor

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

private const val PREFS_NAME = "step_boundary_prefs"
private const val KEY_MARKS = "marks"

/** 걸음 원장의 LEDGER_RETENTION_DAYS와 같게 유지한다. */
private const val RETENTION = 14

/** 자정에 찍어둔 걸음 센서 값. */
data class StepBoundaryMark(
  /** 이 마크가 닫는 날짜('yyyy-MM-dd'). 자정을 넘기며 **끝난** 날이다. */
  val date: String,
  /** 그 시점의 센서 누적 걸음. */
  val steps: Double,
  /** 그 시점의 부팅 이후 경과시간. 원장이 재부팅을 판정하는 데 쓴다. */
  val elapsedRealtimeMs: Double,
)

/**
 * 자정 경계 마크 저장소.
 *
 * 상주 서비스(StepCountingService)가 자정마다 센서 값을 찍어두면, JS 걸음 원장이 다음에
 * 읽을 때 그 값을 읽기 하나로 취급해 재생한다. 원장은 "직전 읽기 대비 증가분"만 더하므로,
 * 마크가 없으면 밤새 걸은 몫이 통째로 다음 날로 밀린다.
 *
 * **읽어간 마크를 여기서 지우지 않는다.** 지우는 시점과 원장 저장 시점 사이에 앱이 죽으면
 * 같은 마크가 두 번 반영되고, 그러면 원장이 그 차이를 재부팅으로 오판해 걸음이 폭증한다.
 * 중복 판단은 원장이 lastBoundaryDate로 한다(stepLedger.ts). 여기서는 보관 기간만 지킨다.
 */
class StepBoundaryStore(private val context: Context) {

  private val prefs by lazy {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  /** 날짜 오름차순. 깨진 값은 통째로 버린다 — 못 읽는 마크로 걸음을 어긋나게 두느니 낫다. */
  fun read(): List<StepBoundaryMark> {
    val stored = prefs.getString(KEY_MARKS, null) ?: return emptyList()

    return try {
      val array = JSONArray(stored)
      (0 until array.length())
        .map { index -> array.getJSONObject(index) }
        .map { json ->
          StepBoundaryMark(
            date = json.getString("date"),
            steps = json.getDouble("steps"),
            elapsedRealtimeMs = json.getDouble("elapsedRealtimeMs"),
          )
        }
        .sortedBy { it.date }
    } catch (e: Exception) {
      emptyList()
    }
  }

  /** 같은 날짜가 이미 있으면 덮어쓴다(시계를 되돌린 경우 등). */
  fun append(mark: StepBoundaryMark) {
    val next = (read().filter { it.date != mark.date } + mark)
      .sortedBy { it.date }
      .takeLast(RETENTION)

    val array = JSONArray()
    next.forEach { item ->
      array.put(
        JSONObject()
          .put("date", item.date)
          .put("steps", item.steps)
          .put("elapsedRealtimeMs", item.elapsedRealtimeMs),
      )
    }
    prefs.edit().putString(KEY_MARKS, array.toString()).apply()
  }
}
