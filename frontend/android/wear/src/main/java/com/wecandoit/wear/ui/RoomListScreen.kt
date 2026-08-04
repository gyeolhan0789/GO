package com.wecandoit.wear.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.ScalingLazyListState
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.ListHeader
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.wecandoit.wear.data.WalkRoom

/**
 * 산책방 고르기. 폰의 WalkRoomSelectSheet가 보여주는 목록과 같은 것을 받는다.
 *
 * 방을 새로 만들거나 빙고판을 갱신하는 일은 워치에서 하지 않는다. 그런 방은
 * 폰이 startable=false로 내려주고, 여기서는 이유만 보여주고 누르지 못하게 한다.
 */
@Composable
fun RoomListScreen(
  title: String,
  emptyMessage: String,
  rooms: List<WalkRoom>,
  isSending: Boolean,
  listState: ScalingLazyListState,
  onStart: (WalkRoom) -> Unit,
) {
  ScalingLazyColumn(
    modifier = Modifier.fillMaxSize(),
    state = listState,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    item { ListHeader { Text(title) } }

    if (rooms.isEmpty()) {
      item {
        Text(
          modifier = Modifier.padding(horizontal = 8.dp),
          text = emptyMessage,
          style = MaterialTheme.typography.caption2,
          color = MaterialTheme.colors.onSurfaceVariant,
          textAlign = TextAlign.Center,
        )
      }
      return@ScalingLazyColumn
    }

    items(rooms, key = { it.roomId }) { room ->
      ActionChip(
        label = room.name.ifEmpty { "산책방" },
        modifier = Modifier.fillMaxWidth(),
        secondaryLabel = room.summaryLabel(),
        colors = ChipDefaults.secondaryChipColors(),
        // 전송 중에는 전부 잠가서 두 방을 연달아 누르는 걸 막는다.
        enabled = room.startable && !isSending,
        onClick = { onStart(room) },
      )
    }
  }
}

private fun WalkRoom.summaryLabel(): String {
  if (!startable) {
    return blockedReason?.takeIf { it.isNotBlank() } ?: "폰에서 확인이 필요해요"
  }
  val people = if (mode == "SINGLE") "혼자" else "${memberCount}명"
  return "$people · 미션 $completedMissions/$totalMissions"
}
