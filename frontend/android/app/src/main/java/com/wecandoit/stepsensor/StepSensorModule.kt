package com.wecandoit.stepsensor

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 기기 내장 걸음 센서(TYPE_STEP_COUNTER) 네이티브 모듈. 삼성헬스 미동의/미지원
 * 사용자를 위한 대체 걸음수 소스다. 실제 읽기 로직은 StepSensorReader에 있다
 * (WalkForegroundService와 공유).
 */
class StepSensorModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "StepSensor"

  private val reader = StepSensorReader(reactContext)

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(reader.isAvailable())
  }

  @ReactMethod
  fun readTodaySteps(promise: Promise) {
    reader.readTodaySteps(
      onResult = { steps -> promise.resolve(steps) },
      onError = { code, message -> promise.reject(code, message) },
    )
  }

  /**
   * 센서 원시값과 부팅 이후 경과시간. 날짜 경계·재부팅 판정은 JS 걸음 원장이 한다
   * (stepLedger.ts) — 여기서 가공하면 그 판정을 테스트할 수 없다.
   */
  @ReactMethod
  fun readRawCounter(promise: Promise) {
    reader.readRawCounter(
      onResult = { steps, elapsedRealtimeMs ->
        promise.resolve(
          Arguments.createMap().apply {
            putDouble("steps", steps)
            putDouble("elapsedRealtimeMs", elapsedRealtimeMs)
          },
        )
      },
      onError = { code, message -> promise.reject(code, message) },
    )
  }
}
