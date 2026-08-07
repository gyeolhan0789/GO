package com.wecandoit.stepsensor

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.IBinder
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.wecandoit.MainActivity
import java.time.LocalDate
import java.time.ZoneId

private const val CHANNEL_ID = "step_counting"
private const val NOTIFICATION_ID = 4101

private const val ACTION_RECORD_BOUNDARY = "com.wecandoit.stepsensor.RECORD_BOUNDARY"

/**
 * 자정을 확실히 넘긴 뒤에 찍는다. 알람이 몇 초 일찍 오면 '끝난 날짜'가 하루 어긋난다.
 */
private const val BOUNDARY_MARGIN_MS = 5_000L

/**
 * 걸음 센서를 구독한 채로 떠 있는 포그라운드 서비스.
 *
 * 삼성 센서허브의 만보기는 **구독자가 붙어 있는 동안에만 돈다**(2026-08-06 SM-G781N에서
 * 확인: 구독 없이 3시간을 걸어도 누적치가 1481에서 그대로였고, 리스너를 붙인 뒤에는
 * 걸음마다 1씩 올라갔다). 삼성헬스가 깔린 기기는 그 앱이 상시 구독자 노릇을 해주지만,
 * 없는 기기에서는 아무도 구독하지 않아 TYPE_STEP_COUNTER가 통째로 멈춘다. 등록했다
 * 곧바로 해제하는 짧은 읽기(StepSensorReader)는 그 멈춘 캐시값만 받으므로 걸음이
 * 영원히 0이 된다.
 *
 * 집계는 예전처럼 JS 걸음 원장(stepLedger)이 필요할 때 읽어서 한다. 이 서비스가 떠
 * 있는 동안에는 그 읽기가 최신값을 받는다.
 *
 * 여기에 더해 **자정마다 그 순간의 센서 값을 찍어둔다**(StepBoundaryStore). 원장은 앱이
 * 앞으로 올 때만 갱신되므로, 마크가 없으면 저녁에 걷고 다음 날 아침에 앱을 연 사람의
 * 걸음이 통째로 다음 날 몫이 된다. 마크를 남겨두면 원장이 그 값을 읽기 하나로 재생해
 * 날짜별로 갈라 담는다.
 *
 * 삼성헬스를 쓰는 기기에서는 띄우지 않는다(알림만 늘고 얻는 게 없다) — 판단은
 * useStepCountingService가 한다.
 */
class StepCountingService : Service() {

  private data class SensorReading(val steps: Double, val elapsedRealtimeMs: Double)

  private val sensorManager: SensorManager by lazy {
    getSystemService(Context.SENSOR_SERVICE) as SensorManager
  }

  private val alarmManager: AlarmManager by lazy {
    getSystemService(Context.ALARM_SERVICE) as AlarmManager
  }

  private val boundaryStore by lazy { StepBoundaryStore(this) }

  /**
   * 마지막으로 받은 센서 값. 자정에 이 값을 그대로 찍는다.
   *
   * 그때 가서 센서를 새로 읽지 않는다 — 등록하고 이벤트를 기다리는 방식이라 5초까지
   * 걸릴 수 있고, 하필 자정 경계에서 그만큼 어긋난다. 어차피 계속 구독 중이라 최신값이
   * 여기 들어와 있다.
   */
  @Volatile
  private var lastReading: SensorReading? = null

  private val listener = object : SensorEventListener {
    override fun onSensorChanged(event: SensorEvent) {
      lastReading = SensorReading(
        steps = event.values[0].toDouble(),
        // StepSensorReader와 같은 시계를 쓴다. 원장의 재부팅 판정이 이 값을 비교한다.
        elapsedRealtimeMs = SystemClock.elapsedRealtime().toDouble(),
      )
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  }

  private val boundaryReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      recordBoundary()
      scheduleNextBoundary()
    }
  }

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
    // 배치(maxReportLatency)를 주지 않는다. 하드웨어 FIFO에 이벤트가 쌓여 있는 동안에는
    // 새로 등록한 쪽이 옛 값을 받을 수 있어서, 원장 읽기가 다시 뒤처진다.
    sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)?.let { sensor ->
      sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
    }
    ContextCompat.registerReceiver(
      this,
      boundaryReceiver,
      IntentFilter(ACTION_RECORD_BOUNDARY),
      ContextCompat.RECEIVER_NOT_EXPORTED,
    )
    scheduleNextBoundary()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIFICATION_ID, buildNotification())
    // 센서가 없는 기기에서는 구독할 것이 없으니 알림만 남기지 않고 바로 내려간다.
    if (sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    return START_STICKY
  }

  override fun onDestroy() {
    sensorManager.unregisterListener(listener)
    unregisterReceiver(boundaryReceiver)
    alarmManager.cancel(boundaryIntent())
    super.onDestroy()
  }

  // ---- 자정 경계 ----

  /**
   * 다음 자정 직후에 깨워달라고 알람을 건다.
   *
   * Handler.postDelayed는 쓸 수 없다 — uptimeMillis 기준이라 기기가 깊이 잠든 시간을
   * 세지 않아서 자정을 한참 지나 깨어난다. setAndAllowWhileIdle은 Doze에서도 깨우고
   * 별도 권한이 없다. 정확 알람(setExactAndAllowWhileIdle)은 Android 13+에서 사용자
   * 허용이 필요한데, 자정 직후 몇 분 오차로 잃는 건 그 시간대의 몇 걸음뿐이라 쓰지 않는다.
   */
  private fun scheduleNextBoundary() {
    val atMillis = LocalDate.now()
      .plusDays(1)
      .atStartOfDay(ZoneId.systemDefault())
      .toInstant()
      .toEpochMilli() + BOUNDARY_MARGIN_MS

    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, boundaryIntent())
  }

  /**
   * 방금 끝난 날짜로 센서 값을 찍는다.
   *
   * 자정을 넘긴 뒤에 불리므로 '어제'가 방금 끝난 날이다. 아직 센서 이벤트를 한 번도 못
   * 받았으면(구독 직후 등) 찍을 값이 없어 건너뛴다 — 그 하루는 마크 없이 예전처럼 다음
   * 날로 밀린다.
   */
  private fun recordBoundary() {
    val reading = lastReading ?: return
    boundaryStore.append(
      StepBoundaryMark(
        date = LocalDate.now().minusDays(1).toString(),
        steps = reading.steps,
        elapsedRealtimeMs = reading.elapsedRealtimeMs,
      ),
    )
  }

  private fun boundaryIntent(): PendingIntent = PendingIntent.getBroadcast(
    this,
    0,
    Intent(ACTION_RECORD_BOUNDARY).setPackage(packageName),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  override fun onBind(intent: Intent?): IBinder? = null

  private fun ensureChannel() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "걸음 수 측정",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "걸음 수를 세기 위해 항상 떠 있는 알림입니다."
      setSound(null, null)
      enableVibration(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification() =
    NotificationCompat.Builder(this, CHANNEL_ID)
      // TODO: 산책 알림과 함께 전용 모노크롬 아이콘으로 교체 — 지금은 런처 아이콘을 쓴다.
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("걸음 수 측정 중")
      .setContentText("오늘 걸은 걸음을 세고 있어요.")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(buildContentIntent())
      .build()

  private fun buildContentIntent(): PendingIntent {
    val intent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    return PendingIntent.getActivity(
      this,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  companion object {
    fun start(context: Context) {
      ContextCompat.startForegroundService(
        context,
        Intent(context, StepCountingService::class.java),
      )
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, StepCountingService::class.java))
    }
  }
}
