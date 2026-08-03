package com.wecandoit.samsunghealth

import android.content.Context
import androidx.core.content.ContextCompat
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

data class SamsungHealthSummary(
  val steps: Double,
  val distanceMeters: Double,
  val activeCalories: Double,
)

/**
 * Samsung Health Data SDK 읽기 전용 로직(오늘 요약 + 권한 조회)만 담는다.
 * `SamsungHealthModule`(Promise 기반 RN 브릿지)과 `WalkForegroundService`(Activity 없는
 * 컨텍스트, 콜백 기반) 양쪽에서 재사용한다. `getStore(context)`는 Activity를 요구하지
 * 않으므로 서비스 컨텍스트에서도 안전하다 — 동의를 요청하는 requestPermissionsAsync만
 * Activity가 필요해 이 리더에는 포함하지 않는다.
 */
class SamsungHealthReader(private val context: Context) {

  private val store: HealthDataStore by lazy { HealthDataService.getStore(context) }

  private val executor: Executor
    get() = ContextCompat.getMainExecutor(context)

  private val readPermissions: Set<Permission> = setOf(
    Permission.of(DataTypes.STEPS, AccessType.READ),
    Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ),
  )

  fun hasPermissions(onResult: (Boolean) -> Unit, onError: (Throwable) -> Unit) {
    try {
      store.getGrantedPermissionsAsync(readPermissions).setCallback(
        executor,
        Consumer { granted -> onResult(granted.containsAll(readPermissions)) },
        Consumer { t -> onError(t) },
      )
    } catch (t: Throwable) {
      onError(t)
    }
  }

  fun readToday(onResult: (SamsungHealthSummary) -> Unit, onError: (Throwable) -> Unit) {
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
                  onResult(SamsungHealthSummary(steps.toDouble(), distance.toDouble(), calories.toDouble()))
                },
                Consumer { t -> onError(t) },
              )
            },
            Consumer { t -> onError(t) },
          )
        },
        Consumer { t -> onError(t) },
      )
    } catch (t: Throwable) {
      onError(t)
    }
  }
}
