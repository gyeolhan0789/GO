package com.wecandoit.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.Colors
import androidx.wear.compose.material.MaterialTheme

// 폰 앱의 shared/constants/colors.ts와 같은 값. 워치는 항상 검은 배경이라
// (OLED 전력) 폰의 밝은 테마를 그대로 옮기지 않고 강조색만 맞춘다.
private val Primary = Color(0xFF27A34A)
private val PrimarySoft = Color(0xFF7FC46E)
private val Danger = Color(0xFFB3261E)

private val WearColors = Colors(
  primary = Primary,
  primaryVariant = Color(0xFF2C6A47),
  secondary = PrimarySoft,
  secondaryVariant = Color(0xFF63AC55),
  error = Danger,
  onPrimary = Color.White,
  onSecondary = Color(0xFF111827),
  onError = Color.White,
)

@Composable
fun WearTheme(content: @Composable () -> Unit) {
  MaterialTheme(colors = WearColors, content = content)
}
