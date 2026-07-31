package com.wecandoit.samsunghealth

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
import com.samsung.android.sdk.health.data.request.AggregateRequest
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import com.samsung.android.sdk.health.data.request.LocalTimeGroup
import com.samsung.android.sdk.health.data.request.LocalTimeGroupUnit
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.Executor
import java.util.function.Consumer

/**
 * Samsung Health Data SDK 네이티브 모듈 (읽기 전용).
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

  /**
   * 버킷 집계 결과를 '버킷 시작 시각 -> 값' 맵으로 바꿔 넘긴다.
   *
   * Consumer에 타입을 적지 않고 associate도 쓰지 않는다. 둘 중 하나라도 추론을
   * 거치면 SDK 제네릭과 얽혀 dataList 원소 타입을 못 정한다.
   */
  private fun <T : Number> aggregateByBucket(
    request: AggregateRequest<T>,
    onSuccess: (Map<LocalDateTime, Double>) -> Unit,
    onError: (Throwable) -> Unit,
  ) {
    store.aggregateDataAsync(request).setCallback(
      executor,
      Consumer { response ->
        val valueByBucket = mutableMapOf<LocalDateTime, Double>()
        response.dataList.forEach { entry ->
          // 이건 프로퍼티가 아니라 메서드다(value/startTime과 달리).
          valueByBucket[entry.getStartLocalDateTime()] = entry.value?.toDouble() ?: 0.0
        }
        onSuccess(valueByBucket)
      },
      Consumer { throwable -> onError(throwable) },
    )
  }

  /**
   * 양 끝을 포함하는 시간 필터. 끝 날짜 당일을 담으려면 다음 날 자정까지 봐야 한다.
   * 미래까지 요청하면 SDK가 거부할 수 있어 readToday처럼 '지금'에서 잘라낸다.
   * 구간이 통째로 미래면 null.
   */
  private fun inclusiveDayFilter(start: LocalDate, end: LocalDate): LocalTimeFilter? {
    val now = LocalDateTime.now()
    val startAt = LocalDateTime.of(start, LocalTime.MIN)
    if (startAt.isAfter(now)) {
      return null
    }

    val endAt = LocalDateTime.of(end.plusDays(1), LocalTime.MIN)
    return LocalTimeFilter.of(startAt, if (endAt.isAfter(now)) now else endAt)
  }

  /**
   * 기간 내 날짜별 걸음/거리/활동칼로리. 'yyyy-MM-dd', 양쪽 다 포함.
   * 기록이 없는 날은 버킷이 안 내려와서 결과에서 빠진다(JS에서 0으로 채운다).
   */
  @ReactMethod
  fun readDailySummaries(startDate: String, endDate: String, promise: Promise) {
    try {
      val filter = inclusiveDayFilter(
        LocalDate.parse(startDate),
        LocalDate.parse(endDate),
      )
      if (filter == null) {
        promise.resolve(Arguments.createArray())
        return
      }
      val dailyGroup = LocalTimeGroup.of(LocalTimeGroupUnit.DAILY, 1)

      aggregateByBucket(
        DataType.StepsType.TOTAL.requestBuilder
          .setLocalTimeFilterWithGroup(filter, dailyGroup)
          .build(),
        { stepsByBucket ->
          aggregateByBucket(
            DataType.ActivitySummaryType.TOTAL_DISTANCE.requestBuilder
              .setLocalTimeFilterWithGroup(filter, dailyGroup)
              .build(),
            { distanceByBucket ->
              aggregateByBucket(
                DataType.ActivitySummaryType.TOTAL_ACTIVE_CALORIES_BURNED.requestBuilder
                  .setLocalTimeFilterWithGroup(filter, dailyGroup)
                  .build(),
                { caloriesByBucket ->
                  promise.resolve(
                    buildDailyArray(stepsByBucket, distanceByBucket, caloriesByBucket),
                  )
                },
                { t -> promise.reject("CALORIES_FAILED", t) },
              )
            },
            { t -> promise.reject("DISTANCE_FAILED", t) },
          )
        },
        { t -> promise.reject("STEPS_FAILED", t) },
      )
    } catch (t: Throwable) {
      promise.reject("READ_DAILY_ERROR", t)
    }
  }

  private fun buildDailyArray(
    stepsByBucket: Map<LocalDateTime, Double>,
    distanceByBucket: Map<LocalDateTime, Double>,
    caloriesByBucket: Map<LocalDateTime, Double>,
  ) = Arguments.createArray().apply {
    // 세 지표가 서로 다른 날짜 집합을 줄 수 있어 합집합으로 묶는다.
    val byDate = { bucket: Map<LocalDateTime, Double> ->
      bucket.mapKeys { (time, _) -> time.toLocalDate() }
    }
    val steps = byDate(stepsByBucket)
    val distance = byDate(distanceByBucket)
    val calories = byDate(caloriesByBucket)

    (steps.keys + distance.keys + calories.keys).sorted().forEach { date ->
      pushMap(
        Arguments.createMap().apply {
          putString("date", date.toString())
          putDouble("steps", steps[date] ?: 0.0)
          putDouble("distanceMeters", distance[date] ?: 0.0)
          putDouble("activeCalories", calories[date] ?: 0.0)
        },
      )
    }
  }

  /** 하루의 시간대별 걸음. 걸음이 없는 시간대는 결과에서 빠진다(JS에서 채운다). */
  @ReactMethod
  fun readHourlySteps(date: String, promise: Promise) {
    try {
      val day = LocalDate.parse(date)
      val filter = inclusiveDayFilter(day, day)
      if (filter == null) {
        promise.resolve(Arguments.createArray())
        return
      }

      aggregateByBucket(
        DataType.StepsType.TOTAL.requestBuilder
          .setLocalTimeFilterWithGroup(
            filter,
            LocalTimeGroup.of(LocalTimeGroupUnit.HOURLY, 1),
          )
          .build(),
        { stepsByBucket ->
          val result = Arguments.createArray()
          stepsByBucket.entries
            .sortedBy { (time, _) -> time }
            .forEach { (time, steps) ->
              result.pushMap(
                Arguments.createMap().apply {
                  putInt("hour", time.hour)
                  putDouble("steps", steps)
                },
              )
            }
          promise.resolve(result)
        },
        { t -> promise.reject("STEPS_FAILED", t) },
      )
    } catch (t: Throwable) {
      promise.reject("READ_HOURLY_ERROR", t)
    }
  }
}
