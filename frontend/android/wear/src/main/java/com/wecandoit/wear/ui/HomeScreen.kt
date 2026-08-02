package com.wecandoit.wear.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.ScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.wecandoit.wear.data.PhoneState
import com.wecandoit.wear.data.TodayStats

/**
 * 첫 화면. 내 캐릭터와 오늘 걸음수를 보여주고, 산책방 선택으로 넘어가는 곳.
 * 이미 산책 중이면 방 선택 대신 "산책 중" 칩이 뜬다.
 */
@Composable
fun HomeScreen(
  state: PhoneState?,
  character: ImageBitmap?,
  phoneConnected: Boolean,
  listState: ScalingLazyListState,
  onSelectRoom: () -> Unit,
  onOpenSession: () -> Unit,
) {
  ScalingLazyColumn(
    modifier = Modifier.fillMaxSize(),
    state = listState,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    item { CharacterBust(character = character, progress = state?.today?.goalProgress) }

    item {
      Text(
        text = state?.nickname.orEmpty().ifEmpty { "산책러" },
        style = MaterialTheme.typography.title3,
        textAlign = TextAlign.Center,
      )
    }

    item { TodaySummary(today = state?.today ?: TodayStats.EMPTY) }

    val session = state?.session
    if (session != null) {
      item {
        Chip(
          modifier = Modifier.fillMaxWidth(),
          label = { Text("산책 중") },
          secondaryLabel = { Text(session.roomName.ifEmpty { "산책방" }) },
          colors = ChipDefaults.primaryChipColors(),
          onClick = onOpenSession,
        )
      }
    } else {
      item {
        Chip(
          modifier = Modifier.fillMaxWidth(),
          label = { Text("산책 시작") },
          colors = ChipDefaults.primaryChipColors(),
          enabled = phoneConnected,
          onClick = onSelectRoom,
        )
      }
    }

    if (!phoneConnected) {
      item { PhoneDisconnectedNotice() }
    } else if (state == null) {
      item { WaitingForPhoneNotice() }
    }
  }
}

/**
 * 캐릭터 이미지를 오늘 목표 진행률 링 안에 얹는다. 폰에서 합성해 보내준
 * PNG라 워치는 그리기만 한다(아이템 조합/레이어 순서는 전부 폰 몫).
 */
@Composable
private fun CharacterBust(character: ImageBitmap?, progress: Float?) {
  Box(
    modifier = Modifier.size(84.dp),
    contentAlignment = Alignment.Center,
  ) {
    if (progress != null) {
      CircularProgressIndicator(
        progress = progress,
        modifier = Modifier.fillMaxSize(),
        strokeWidth = 4.dp,
        indicatorColor = MaterialTheme.colors.primary,
        trackColor = MaterialTheme.colors.onSurfaceVariant.copy(alpha = 0.2f),
      )
    }
    if (character != null) {
      Image(
        bitmap = character,
        contentDescription = "내 캐릭터",
        modifier = Modifier.size(64.dp),
        contentScale = ContentScale.Fit,
      )
    } else {
      // 폰이 아직 캐릭터를 안 보냈을 때. 링만 남기면 빈 구멍처럼 보인다.
      Text(text = "🚶", style = MaterialTheme.typography.display3)
    }
  }
}

@Composable
private fun TodaySummary(today: TodayStats) {
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Text(
      text = formatCount(today.steps),
      style = MaterialTheme.typography.display2,
      color = MaterialTheme.colors.primary,
    )
    Text(
      text = if (today.goalSteps > 0) {
        "걸음 · 목표 ${formatCount(today.goalSteps)}"
      } else {
        "걸음"
      },
      style = MaterialTheme.typography.caption2,
      color = MaterialTheme.colors.onSurfaceVariant,
    )
    Row(
      modifier = Modifier.padding(top = 4.dp),
      horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
      Text(
        text = "${formatDistanceKm(today.distanceMeters)}km",
        style = MaterialTheme.typography.caption1,
      )
      Text(
        text = "${formatCount(today.calories)}kcal",
        style = MaterialTheme.typography.caption1,
      )
    }
  }
}

@Composable
fun PhoneDisconnectedNotice() {
  Text(
    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
    text = "폰과 연결되어 있지 않아요.\n블루투스를 확인해주세요.",
    style = MaterialTheme.typography.caption2,
    color = MaterialTheme.colors.onSurfaceVariant,
    textAlign = TextAlign.Center,
  )
}

@Composable
fun WaitingForPhoneNotice() {
  Text(
    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
    text = "폰에서 앱을 한 번 열어주세요.",
    style = MaterialTheme.typography.caption2,
    color = MaterialTheme.colors.onSurfaceVariant,
    textAlign = TextAlign.Center,
  )
}
