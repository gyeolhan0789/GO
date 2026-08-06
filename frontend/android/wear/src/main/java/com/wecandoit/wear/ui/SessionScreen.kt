package com.wecandoit.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.ScalingLazyListState
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.wecandoit.wear.data.PhoneState
import kotlinx.coroutines.delay

/**
 * 진행 중인 산책. 경과 시간만 워치가 자기 시계로 이어 세고, 걸음/거리/칼로리는
 * 폰이 밀어주는 값을 그대로 보여준다(폰 화면과 숫자가 어긋나지 않게).
 */
@Composable
fun SessionScreen(
  state: PhoneState,
  isSending: Boolean,
  listState: ScalingLazyListState,
  onTogglePause: () -> Unit,
  onRequestEnd: () -> Unit,
) {
  val session = state.session ?: return

  // 1초마다 다시 계산한다. 일시정지 중에는 폰이 보낸 값에서 멈춘다.
  val elapsedSeconds by produceState(
    initialValue = state.currentElapsedSeconds(),
    state,
  ) {
    while (true) {
      value = state.currentElapsedSeconds()
      delay(1000)
    }
  }

  ScalingLazyColumn(
    modifier = Modifier.fillMaxSize(),
    state = listState,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    // 방 이름이 아직 안 왔으면 비워둔다. 폰이 방 목록을 늦게 채우는 동안 "산책 중"을
    // 넣으면 그게 방 이름인 줄 알게 된다(아래 경과 시간이 이미 상태를 말해준다).
    if (session.roomName.isNotEmpty()) {
      item {
        Text(
          text = session.roomName,
          style = MaterialTheme.typography.caption1,
          color = MaterialTheme.colors.onSurfaceVariant,
          textAlign = TextAlign.Center,
        )
      }
    }

    item {
      Text(
        text = if (session.started) formatElapsed(elapsedSeconds) else "준비 중",
        style = MaterialTheme.typography.display1,
        color = if (session.paused) {
          MaterialTheme.colors.onSurfaceVariant
        } else {
          MaterialTheme.colors.onSurface
        },
      )
    }

    if (session.paused) {
      item {
        Text(
          text = "일시정지",
          style = MaterialTheme.typography.caption3,
          color = MaterialTheme.colors.onSurfaceVariant,
        )
      }
    }

    item {
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
          text = formatCount(session.steps),
          style = MaterialTheme.typography.display2,
          color = MaterialTheme.colors.primary,
        )
        Text(
          text = "이번 산책 걸음",
          style = MaterialTheme.typography.caption3,
          color = MaterialTheme.colors.onSurfaceVariant,
        )
        Row(
          modifier = Modifier.padding(top = 4.dp),
          horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
          Text(
            text = "${formatDistanceKm(session.distanceMeters)}km",
            style = MaterialTheme.typography.caption1,
          )
          Text(
            text = "${formatCount(session.calories)}kcal",
            style = MaterialTheme.typography.caption1,
          )
        }
      }
    }

    item {
      ActionChipRow {
        // 카운트다운이 끝나기 전에는 멈출 게 없어서 잠가둔다. 폰이 세션을 시작한
        // 뒤에야 started가 서고, 그때부터 눌리기 시작한다.
        ActionChip(
          label = if (session.paused) "재개" else "일시정지",
          modifier = Modifier.weight(1f),
          colors = ChipDefaults.secondaryChipColors(),
          enabled = session.started && !isSending,
          onClick = onTogglePause,
        )
        ActionChip(
          label = "종료",
          modifier = Modifier.weight(1f),
          colors = ChipDefaults.chipColors(
            backgroundColor = MaterialTheme.colors.error,
            contentColor = MaterialTheme.colors.onError,
          ),
          enabled = !isSending,
          onClick = onRequestEnd,
        )
      }
    }
  }
}
