package com.wecandoit.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipColors
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Text

/** 버튼이 위쪽 내용에 붙어 보이지 않게 두는 간격. */
private val BUTTON_TOP_MARGIN = 12.dp

/** 나란히 놓인 두 버튼 사이 간격. 워치 폭이 좁아 최소로 잡는다. */
private val BUTTON_GAP = 6.dp

/**
 * 워치 화면의 실행 버튼.
 *
 * Wear의 [Chip]은 왼쪽 아이콘 + 오른쪽 라벨 배치를 전제로 라벨을 왼쪽에 붙인다.
 * 우리 화면에는 아이콘이 없어서 글자가 한쪽으로 쏠려 보이므로, 라벨을 칩 폭
 * 전체로 늘려 가운데 정렬한다. 칩을 쓰는 곳이 여러 화면이라 여기 한 곳에 모아
 * 두고 정렬 규칙이 화면마다 달라지지 않게 한다.
 *
 * 폭은 [modifier]로 호출부가 정한다 — 혼자 쓸 때는 `fillMaxWidth()`, [ActionChipRow]
 * 안에서는 `weight(1f)`를 넘긴다.
 */
@Composable
fun ActionChip(
  label: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  secondaryLabel: String? = null,
  colors: ChipColors = ChipDefaults.primaryChipColors(),
  enabled: Boolean = true,
) {
  Chip(
    modifier = modifier,
    label = { CenteredLabel(label) },
    secondaryLabel = secondaryLabel?.let { { CenteredLabel(it) } },
    colors = colors,
    enabled = enabled,
    onClick = onClick,
  )
}

/** 혼자 쓰는 버튼. 폭을 다 쓰고 위쪽 간격만 [ActionChipRow]와 맞춘다. */
@Composable
fun FullWidthActionChip(
  label: String,
  onClick: () -> Unit,
  secondaryLabel: String? = null,
  colors: ChipColors = ChipDefaults.primaryChipColors(),
  enabled: Boolean = true,
) {
  ActionChip(
    label = label,
    onClick = onClick,
    modifier = Modifier
      .padding(top = BUTTON_TOP_MARGIN)
      .fillMaxWidth(),
    secondaryLabel = secondaryLabel,
    colors = colors,
    enabled = enabled,
  )
}

/**
 * 버튼 두 개를 좌우로 나란히 놓는다. 안쪽 [ActionChip]에는 `Modifier.weight(1f)`를
 * 줘서 남은 폭을 반씩 나눠 갖게 한다.
 */
@Composable
fun ActionChipRow(content: @Composable RowScope.() -> Unit) {
  Row(
    modifier = Modifier
      .padding(top = BUTTON_TOP_MARGIN)
      .fillMaxWidth(),
    horizontalArrangement = Arrangement.spacedBy(BUTTON_GAP),
    content = content,
  )
}

@Composable
private fun CenteredLabel(text: String) {
  Text(
    text = text,
    modifier = Modifier.fillMaxWidth(),
    textAlign = TextAlign.Center,
    maxLines = 1,
  )
}
