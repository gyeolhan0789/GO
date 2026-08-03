package com.wecandoit.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text

/**
 * 종료 확인. 폰의 Alert('지금 산책을 종료할까요?')와 같은 자리다 — 산책 종료는
 * 되돌릴 수 없고 기록이 서버로 올라가므로 워치에서도 한 번 더 묻는다.
 */
@Composable
fun EndConfirmScreen(onConfirm: () -> Unit, onCancel: () -> Unit) {
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 16.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text(
      text = "지금 산책을\n종료할까요?",
      style = MaterialTheme.typography.title3,
      textAlign = TextAlign.Center,
    )
    Row(
      modifier = Modifier.padding(top = 16.dp),
      horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
      Button(
        onClick = onCancel,
        colors = ButtonDefaults.secondaryButtonColors(),
      ) {
        Text("취소")
      }
      Button(
        onClick = onConfirm,
        colors = ButtonDefaults.buttonColors(
          backgroundColor = MaterialTheme.colors.error,
          contentColor = MaterialTheme.colors.onError,
        ),
      ) {
        Text("종료")
      }
    }
  }
}
