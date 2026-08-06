package com.wecandoit.stepsensor

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.wecandoit.MainActivity

private const val CHANNEL_ID = "step_counting"
private const val NOTIFICATION_ID = 4101

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
 * 그래서 이 서비스는 센서 값을 쓰지 않는다. **구독을 유지하는 것 자체가 하는 일**이고,
 * 집계는 예전처럼 JS 걸음 원장(stepLedger)이 필요할 때 읽어서 한다. 이 서비스가 떠
 * 있는 동안에는 그 읽기가 최신값을 받는다.
 *
 * 삼성헬스를 쓰는 기기에서는 띄우지 않는다(알림만 늘고 얻는 게 없다) — 판단은
 * useStepCountingService가 한다.
 */
class StepCountingService : Service() {

  private val sensorManager: SensorManager by lazy {
    getSystemService(Context.SENSOR_SERVICE) as SensorManager
  }

  /**
   * 이벤트로는 아무것도 하지 않는다. 구독이 있다는 사실만으로 센서허브가 걸음을 세고,
   * 그 값은 원장이 읽어간다.
   */
  private val listener = object : SensorEventListener {
    override fun onSensorChanged(event: SensorEvent) = Unit
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  }

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
    // 배치(maxReportLatency)를 주지 않는다. 하드웨어 FIFO에 이벤트가 쌓여 있는 동안에는
    // 새로 등록한 쪽이 옛 값을 받을 수 있어서, 원장 읽기가 다시 뒤처진다.
    sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)?.let { sensor ->
      sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
    }
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
    super.onDestroy()
  }

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
