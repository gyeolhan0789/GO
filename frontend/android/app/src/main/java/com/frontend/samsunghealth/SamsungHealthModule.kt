package com.frontend.samsunghealth

import android.app.Activity
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.HealthDataStore
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.Executor
import java.util.function.Consumer

/**
 * Samsung Health Data SDK 네이티브 모듈 (읽기 전용).
 * 걸음수(StepsType.TOTAL), 거리/활동칼로리(ActivitySummaryType)를 오늘 기준으로 집계.
 * 코루틴 대신 *Async(AsyncSingleFuture) API + setCallback으로 Promise에 연결.
 */
class SamsungHealthModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SamsungHealth"

  private val store: HealthDataStore by lazy { HealthDataService.getStore(reactContext) }

  private val executor: Executor
    get() = ContextCompat.getMainExecutor(reactContext)

  private val readPermissions: Set<Permission> = setOf(
    Permission.of(DataTypes.STEPS, AccessType.READ),
    Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ),
  )

  @ReactMethod
  fun requestPermissions(promise: Promise) {
    val activity: Activity? = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "현재 액티비티가 없습니다.")
      return
    }
    try {
      store.requestPermissionsAsync(readPermissions, activity).setCallback(
        executor,
        Consumer { granted -> promise.resolve(granted.containsAll(readPermissions)) },
        Consumer { t -> promise.reject("REQUEST_FAILED", t) },
      )
    } catch (t: Throwable) {
      promise.reject("REQUEST_ERROR", t)
    }
  }

  @ReactMethod
  fun hasPermissions(promise: Promise) {
    try {
      store.getGrantedPermissionsAsync(readPermissions).setCallback(
        executor,
        Consumer { granted -> promise.resolve(granted.containsAll(readPermissions)) },
        Consumer { t -> promise.reject("CHECK_FAILED", t) },
      )
    } catch (t: Throwable) {
      promise.reject("CHECK_ERROR", t)
    }
  }

  @ReactMethod
  fun readToday(promise: Promise) {
    try {
      val filter = LocalTimeFilter.of(
        LocalDateTime.of(LocalDate.now(), LocalTime.MIN),
        LocalDateTime.now(),
      )

      val stepsRequest = DataType.StepsType.TOTAL.requestBuilder
        .setLocalTimeFilter(filter)
        .build()
      store.aggregateDataAsync(stepsRequest).setCallback(
        executor,
        Consumer { stepsResponse ->
          val steps = stepsResponse.dataList.firstOrNull()?.value ?: 0L

          val distanceRequest = DataType.ActivitySummaryType.TOTAL_DISTANCE.requestBuilder
            .setLocalTimeFilter(filter)
            .build()
          store.aggregateDataAsync(distanceRequest).setCallback(
            executor,
            Consumer { distanceResponse ->
              val distance = distanceResponse.dataList.firstOrNull()?.value ?: 0f

              val caloriesRequest =
                DataType.ActivitySummaryType.TOTAL_ACTIVE_CALORIES_BURNED.requestBuilder
                  .setLocalTimeFilter(filter)
                  .build()
              store.aggregateDataAsync(caloriesRequest).setCallback(
                executor,
                Consumer { caloriesResponse ->
                  val calories = caloriesResponse.dataList.firstOrNull()?.value ?: 0f
                  val result = Arguments.createMap().apply {
                    putDouble("steps", steps.toDouble())
                    putDouble("distanceMeters", distance.toDouble())
                    putDouble("activeCalories", calories.toDouble())
                  }
                  promise.resolve(result)
                },
                Consumer { t -> promise.reject("CALORIES_FAILED", t) },
              )
            },
            Consumer { t -> promise.reject("DISTANCE_FAILED", t) },
          )
        },
        Consumer { t -> promise.reject("STEPS_FAILED", t) },
      )
    } catch (t: Throwable) {
      promise.reject("READ_ERROR", t)
    }
  }
}
