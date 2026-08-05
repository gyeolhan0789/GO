package com.wecandoit.stepsensor

import android.content.Context
import android.content.SharedPreferences
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import java.time.LocalDate

private const val PREFS_NAME = "step_sensor_prefs"
private const val KEY_BASELINE_DATE = "baseline_date"
private const val KEY_BASELINE_STEPS = "baseline_steps"
private const val READ_TIMEOUT_MS = 5000L

/**
 * 기기 내장 걸음 센서(TYPE_STEP_COUNTER) 읽기 로직. `StepSensorModule`(Promise 기반 RN
 * 브릿지)과 `WalkForegroundService`(콜백 기반) 양쪽에서 재사용한다.
 *
 * TYPE_STEP_COUNTER는 마지막 재부팅 이후 누적치라 그 값 자체는 "오늘 걸음"이 아니다.
 * 날짜가 바뀌거나(자정 경과) 재부팅으로 값이 줄어들면 그 시점 값을 새 기준값으로
 * SharedPreferences에 저장해두고, 이후 값에서 기준값을 뺀 만큼을 오늘 걸음으로 돌려준다.
 */
class StepSensorReader(private val context: Context) {

  private val sensorManager: SensorManager by lazy {
    context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  }

  private val prefs: SharedPreferences by lazy {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  fun isAvailable(): Boolean = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null

  fun readTodaySteps(onResult: (Double) -> Unit, onError: (code: String, message: String) -> Unit) {
    readCounter(
      onResult = { raw -> onResult(todayStepsFromRaw(raw)) },
      onError = onError,
    )
  }

  /**
   * 센서 원시값(마지막 재부팅 이후 누적 걸음)과 부팅 이후 경과시간을 그대로 넘긴다.
   *
   * "오늘 걸음"으로 가공하지 않는 이유: 날짜 경계와 재부팅 판정을 JS 쪽 걸음 원장이
   * 맡는다. 여기서 기준값을 잡아버리면(readTodaySteps) 날짜가 바뀐 첫 읽기가 0을
   * 반환해 그 사이에 걸은 걸음이 통째로 사라진다.
   *
   * elapsedRealtime이 직전 읽기보다 작으면 그 사이에 재부팅한 것이다 — 원시값이 0으로
   * 리셋됐다는 뜻이라, 원장이 이걸 보고 직전까지의 몫을 확정해 둔다.
   */
  fun readRawCounter(
    onResult: (steps: Double, elapsedRealtimeMs: Double) -> Unit,
    onError: (code: String, message: String) -> Unit,
  ) {
    readCounter(
      onResult = { raw -> onResult(raw.toDouble(), SystemClock.elapsedRealtime().toDouble()) },
      onError = onError,
    )
  }

  private fun readCounter(
    onResult: (Float) -> Unit,
    onError: (code: String, message: String) -> Unit,
  ) {
    val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    if (sensor == null) {
      onError("STEP_SENSOR_UNAVAILABLE", "이 기기에는 걸음 센서가 없습니다.")
      return
    }

    val handler = Handler(Looper.getMainLooper())
    var resolved = false

    val listener = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        if (resolved) return
        resolved = true
        sensorManager.unregisterListener(this)
        handler.removeCallbacksAndMessages(null)
        onResult(event.values[0])
      }

      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
    }

    sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)

    handler.postDelayed({
      if (!resolved) {
        resolved = true
        sensorManager.unregisterListener(listener)
        onError("STEP_SENSOR_TIMEOUT", "걸음 수를 가져오지 못했습니다.")
      }
    }, READ_TIMEOUT_MS)
  }

  private fun todayStepsFromRaw(raw: Float): Double {
    val today = LocalDate.now().toString()
    val storedDate = prefs.getString(KEY_BASELINE_DATE, null)
    val storedBaseline = prefs.getFloat(KEY_BASELINE_STEPS, -1f)

    val needsNewBaseline = storedDate != today || storedBaseline < 0f || raw < storedBaseline
    val baseline = if (needsNewBaseline) raw else storedBaseline

    if (needsNewBaseline) {
      prefs.edit()
        .putString(KEY_BASELINE_DATE, today)
        .putFloat(KEY_BASELINE_STEPS, baseline)
        .apply()
    }

    return (raw - baseline).toDouble().coerceAtLeast(0.0)
  }
}
