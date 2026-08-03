package com.wecandoit.stepsensor

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
}
