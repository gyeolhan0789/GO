package com.wecandoit.walktracking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/** 알림의 일시정지/재개 버튼을 받아 WalkForegroundService로 같은 명령을 전달한다.
 * 상태를 바꾸는 코드는 서비스의 onStartCommand 한 곳에만 있고, 이 리시버는 순수
 * 중계 역할만 한다 — 앱 화면에서 누른 pause/resume과 완전히 같은 경로를 탄다. */
class WalkActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val serviceAction = when (intent.action) {
      WalkTrackingConstants.ACTION_NOTIF_PAUSE -> WalkTrackingConstants.ACTION_PAUSE
      WalkTrackingConstants.ACTION_NOTIF_RESUME -> WalkTrackingConstants.ACTION_RESUME
      else -> return
    }
    val serviceIntent = Intent(context, WalkForegroundService::class.java).setAction(serviceAction)
    ContextCompat.startForegroundService(context, serviceIntent)
  }
}
