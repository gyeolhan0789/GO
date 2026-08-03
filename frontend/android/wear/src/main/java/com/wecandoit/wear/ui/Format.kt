package com.wecandoit.wear.ui

import java.util.Locale

/** 한 시간이 넘어가면 h:mm:ss로 늘린다(워치 화면이 좁아 평소엔 mm:ss). */
fun formatElapsed(totalSeconds: Int): String {
  val safe = totalSeconds.coerceAtLeast(0)
  val hours = safe / 3600
  val minutes = (safe % 3600) / 60
  val seconds = safe % 60
  return if (hours > 0) {
    String.format(Locale.US, "%d:%02d:%02d", hours, minutes, seconds)
  } else {
    String.format(Locale.US, "%02d:%02d", minutes, seconds)
  }
}

/** 폰 화면과 같은 소수점 한 자리 km. */
fun formatDistanceKm(meters: Int): String =
  String.format(Locale.US, "%.1f", meters / 1000f)

/** 1,234 처럼 천 단위 구분. 워치에서도 네 자리부터는 읽기 어렵다. */
fun formatCount(value: Int): String = String.format(Locale.US, "%,d", value)
