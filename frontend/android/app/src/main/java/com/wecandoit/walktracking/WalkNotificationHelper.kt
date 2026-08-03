package com.wecandoit.walktracking

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.wecandoit.MainActivity
import java.util.Locale

/** 산책 진행 중 상주 알림(ongoing notification)의 채널·빌드·게시를 담당한다. */
class WalkNotificationHelper(private val context: Context) {

  fun ensureChannel() {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(WalkTrackingConstants.CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      WalkTrackingConstants.CHANNEL_ID,
      "산책 기록",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "산책 진행 중 걸음수·거리·시간을 알려줍니다."
      setSound(null, null)
      enableVibration(false)
    }
    manager.createNotificationChannel(channel)
  }

  fun build(state: WalkSessionState, snapshot: WalkSessionSnapshot): Notification {
    val isRunning = state.status == WalkStatus.RUNNING
    val statsText = formatStats(snapshot)

    val builder = NotificationCompat.Builder(context, WalkTrackingConstants.CHANNEL_ID)
      // TODO: 전용 모노크롬 알림 아이콘으로 교체 — 지금은 런처 아이콘을 그대로 쓴다.
      .setSmallIcon(context.applicationInfo.icon)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(buildContentIntent())
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      // 기본값(PRIVATE)이면 기기의 "민감한 알림 내용 숨기기" 설정에 따라
      // 잠금화면에서 축소되거나 아예 안 보일 수 있다 — 민감한 내용이 없으니
      // 항상 전체 내용을 보여준다.
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

    if (isRunning && snapshot.startedAt != null) {
      // pausedMs를 반영한 기준 시각으로 setWhen을 세팅해야 chronometer가 지금까지의
      // 활성 경과시간부터 이어서 틱한다.
      val chronometerBase = System.currentTimeMillis() - snapshot.activeElapsedMs
      builder
        .setContentTitle("산책 기록 중")
        .setUsesChronometer(true)
        .setWhen(chronometerBase)
        .setContentText(statsText)
        .addAction(0, "일시정지", buildActionIntent(WalkTrackingConstants.ACTION_NOTIF_PAUSE, 1))
    } else {
      builder
        .setContentTitle("산책 일시정지됨")
        .setUsesChronometer(false)
        .setContentText("${formatElapsed(snapshot.activeElapsedMs)} · $statsText")
        .addAction(0, "재개", buildActionIntent(WalkTrackingConstants.ACTION_NOTIF_RESUME, 2))
    }

    return builder.build()
  }

  /** startForeground()로 이미 게시된 알림을 같은 ID로 갱신한다(소리·진동 없이). */
  fun postOrUpdate(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    NotificationManagerCompat.from(context).notify(WalkTrackingConstants.NOTIFICATION_ID, notification)
  }

  fun cancel() {
    NotificationManagerCompat.from(context).cancel(WalkTrackingConstants.NOTIFICATION_ID)
  }

  private fun formatStats(snapshot: WalkSessionSnapshot): String =
    String.format(Locale.KOREA, "%,d걸음 · %dkcal", snapshot.steps.toInt(), snapshot.calories.toInt())

  private fun formatElapsed(elapsedMs: Long): String {
    val totalSeconds = elapsedMs / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return String.format(Locale.KOREA, "%02d:%02d:%02d", hours, minutes, seconds)
  }

  private fun buildContentIntent(): PendingIntent {
    val intent = Intent(context, MainActivity::class.java).apply {
      action = WalkTrackingConstants.ACTION_OPEN_WALK_SESSION
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    return PendingIntent.getActivity(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun buildActionIntent(action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, WalkActionReceiver::class.java).setAction(action)
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
