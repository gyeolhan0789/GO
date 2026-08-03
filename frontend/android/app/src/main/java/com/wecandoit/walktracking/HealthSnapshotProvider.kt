package com.wecandoit.walktracking

import android.content.Context
import com.wecandoit.samsunghealth.SamsungHealthReader
import com.wecandoit.stepsensor.StepSensorReader

private const val DEFAULT_GENDER = "MALE"

// frontend/src/shared/lib/stepEstimate.ts와 반드시 같은 값을 유지해야 한다(런타임 간
// 코드 공유 수단이 없어 수동으로 이식됨 — 한쪽만 바꾸면 어긋난다).
private val STRIDE_METERS_BY_GENDER = mapOf("MALE" to 0.78, "FEMALE" to 0.7)
private val CALORIES_PER_STEP_BY_GENDER = mapOf("MALE" to 0.04, "FEMALE" to 0.03)

/**
 * 오늘 누적 걸음/거리/칼로리를 읽는다. 삼성헬스를 쓸 수 있고 권한이 있으면 그 값을,
 * 아니면 기기 걸음 센서 + 성별 기반 거리·칼로리 추정으로 대체한다 —
 * useStepDataToday.ts의 정책을 그대로 네이티브에 옮긴 것이다.
 */
class HealthSnapshotProvider(context: Context) {

  private val samsungHealthReader = SamsungHealthReader(context)
  private val stepSensorReader = StepSensorReader(context)

  fun readNow(gender: String?, onResult: (HealthBaseline, HealthSource) -> Unit) {
    samsungHealthReader.hasPermissions(
      onResult = { granted ->
        if (granted) {
          samsungHealthReader.readToday(
            onResult = { summary ->
              onResult(
                HealthBaseline(summary.steps, summary.distanceMeters, summary.activeCalories),
                HealthSource.SAMSUNG_HEALTH,
              )
            },
            onError = { readFromStepSensor(gender, onResult) },
          )
        } else {
          readFromStepSensor(gender, onResult)
        }
      },
      onError = { readFromStepSensor(gender, onResult) },
    )
  }

  private fun readFromStepSensor(gender: String?, onResult: (HealthBaseline, HealthSource) -> Unit) {
    if (!stepSensorReader.isAvailable()) {
      onResult(HealthBaseline(), HealthSource.NONE)
      return
    }
    stepSensorReader.readTodaySteps(
      onResult = { steps ->
        val key = gender ?: DEFAULT_GENDER
        val stride = STRIDE_METERS_BY_GENDER[key] ?: STRIDE_METERS_BY_GENDER.getValue(DEFAULT_GENDER)
        val caloriesPerStep =
          CALORIES_PER_STEP_BY_GENDER[key] ?: CALORIES_PER_STEP_BY_GENDER.getValue(DEFAULT_GENDER)
        onResult(
          HealthBaseline(steps, steps * stride, steps * caloriesPerStep),
          HealthSource.STEP_SENSOR,
        )
      },
      onError = { _, _ -> onResult(HealthBaseline(), HealthSource.NONE) },
    )
  }
}
