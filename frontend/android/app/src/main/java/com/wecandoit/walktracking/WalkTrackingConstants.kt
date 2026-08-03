package com.wecandoit.walktracking

/** WalkForegroundService/WalkTrackingModule/WalkActionReceiver/MainActivity가 공유하는
 * action 문자열과 상수. 한 곳에 모아 오타로 인한 불일치를 막는다. */
object WalkTrackingConstants {
  const val NOTIFICATION_ID = 4501
  const val CHANNEL_ID = "walk_tracking_channel"

  // WalkTrackingModule -> WalkForegroundService (세션 상태를 바꾸는 명령)
  const val ACTION_START = "com.wecandoit.walktracking.START"
  const val ACTION_PAUSE = "com.wecandoit.walktracking.PAUSE"
  const val ACTION_RESUME = "com.wecandoit.walktracking.RESUME"
  const val ACTION_STOP = "com.wecandoit.walktracking.STOP"

  // 알림 버튼 -> WalkActionReceiver -> (동일한 ACTION_PAUSE/ACTION_RESUME로 변환돼 서비스로 전달)
  const val ACTION_NOTIF_PAUSE = "com.wecandoit.walktracking.NOTIF_PAUSE"
  const val ACTION_NOTIF_RESUME = "com.wecandoit.walktracking.NOTIF_RESUME"

  // 알림 탭 -> MainActivity.onNewIntent
  const val ACTION_OPEN_WALK_SESSION = "com.wecandoit.walktracking.OPEN_WALK_SESSION"

  const val EXTRA_ROOM_ID = "roomId"
  const val EXTRA_GENDER = "gender"

  const val EVENT_STATE_CHANGED = "WalkTrackingStateChanged"
  const val EVENT_ROUTE_APPENDED = "WalkTrackingRouteAppended"
  const val EVENT_OPEN_SESSION = "WalkTrackingOpenSession"
}
