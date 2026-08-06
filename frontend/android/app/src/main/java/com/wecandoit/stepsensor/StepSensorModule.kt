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

  /**
   * 걸음 집계를 시작한다(StepCountingService 기동).
   *
   * 삼성헬스가 없는 기기에서는 이 서비스가 떠 있는 동안에만 센서허브 만보기가 돈다.
   * 켜고 끄는 판단은 JS가 한다 — 삼성헬스를 쓰는 기기에서는 부르지 않는다.
   */
  @ReactMethod
  fun startCounting(promise: Promise) {
    try {
      StepCountingService.start(reactContext)
      promise.resolve(null)
    } catch (e: Exception) {
      // Android 12+는 앱이 백그라운드일 때의 포그라운드 서비스 기동을 막는다
      // (ForegroundServiceStartNotAllowedException). 쿼리가 늦게 끝나 앱이 내려간 뒤에
      // 이 호출이 도착할 수 있어서, 여기서 잡지 않으면 앱이 죽는다. 다음에 앱을 열 때
      // 다시 시도되므로 실패를 그대로 알리고 넘어간다.
      promise.reject("STEP_COUNTING_START_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun stopCounting(promise: Promise) {
    StepCountingService.stop(reactContext)
    promise.resolve(null)
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
