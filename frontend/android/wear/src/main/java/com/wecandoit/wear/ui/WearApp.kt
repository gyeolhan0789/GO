package com.wecandoit.wear.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.Vignette
import androidx.wear.compose.material.VignettePosition
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.wecandoit.wear.WearViewModel
import kotlinx.coroutines.delay

private object Routes {
  const val HOME = "home"

  /** 폰 홈의 혼자하기/같이하기와 같은 두 입구. 목록은 하나고 모드로만 걸러진다. */
  const val ROOMS_SOLO = "rooms-solo"
  const val ROOMS_GROUP = "rooms-group"
  const val SESSION = "session"
  const val END_CONFIRM = "end-confirm"
}

/** RoomDetailResponse.mode와 같은 값. 혼자 산책만 이 모드다. */
private const val MODE_SINGLE = "SINGLE"

private const val ERROR_VISIBLE_MS = 3000L

/**
 * 워치 앱 전체. 화면 흐름은 폰과 같은 순서다.
 *
 *   홈(캐릭터·걸음수) -> 산책방 선택 -> 진행 중 -> 종료 확인 -> 홈
 *
 * 화면 이동을 워치가 혼자 정하지 않는다는 점이 중요하다. "시작"을 눌러도 폰이
 * 세션을 만들어 되밀어줘야 진행 중 화면으로 넘어가고, "종료"도 폰이 세션을
 * 비운 걸 확인한 뒤에 홈으로 돌아온다. 덕분에 폰에서 시작하거나 종료해도
 * 워치가 똑같이 따라온다.
 */
@Composable
fun WearApp(viewModel: WearViewModel) {
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val navController = rememberSwipeDismissableNavController()
  // wear의 compose-navigation은 navigation-runtime만 끌고 와서
  // currentBackStackEntryAsState(navigation-compose)를 쓸 수 없다. 같은 값을
  // 주는 Flow를 직접 구독한다.
  val backStackEntry by navController.currentBackStackEntryFlow.collectAsState(initial = null)
  val currentRoute = backStackEntry?.destination?.route

  // 세션이 "생겼을 때"와 "없어졌을 때"만 화면을 옮긴다. 현재 화면까지 조건에
  // 넣으면, 산책 중에 홈으로 스와이프한 사용자를 계속 세션 화면으로 되돌려
  // 보내게 된다(홈에서는 '산책 중' 칩으로 다시 들어갈 수 있다).
  val hasSession = uiState.phone?.session != null
  LaunchedEffect(hasSession) {
    if (hasSession) {
      navController.navigate(Routes.SESSION) { popUpTo(Routes.HOME) }
    } else {
      navController.popBackStack(Routes.HOME, inclusive = false)
    }
  }

  WearTheme {
    val homeListState = rememberScalingLazyListState()
    // 두 목록이 상태를 나눠 가져야 한쪽에서 스크롤한 위치가 반대쪽에 안 묻는다.
    val soloRoomsListState = rememberScalingLazyListState()
    val groupRoomsListState = rememberScalingLazyListState()
    val sessionListState = rememberScalingLazyListState()

    Scaffold(
      modifier = Modifier.fillMaxSize(),
      timeText = { TimeText() },
      vignette = { Vignette(vignettePosition = VignettePosition.TopAndBottom) },
      positionIndicator = {
        when (currentRoute) {
          Routes.ROOMS_SOLO -> PositionIndicator(scalingLazyListState = soloRoomsListState)
          Routes.ROOMS_GROUP -> PositionIndicator(scalingLazyListState = groupRoomsListState)
          Routes.SESSION -> PositionIndicator(scalingLazyListState = sessionListState)
          else -> PositionIndicator(scalingLazyListState = homeListState)
        }
      },
    ) {
      Box(modifier = Modifier.fillMaxSize()) {
        SwipeDismissableNavHost(
          navController = navController,
          startDestination = Routes.HOME,
        ) {
          composable(Routes.HOME) {
            HomeScreen(
              state = uiState.phone,
              character = uiState.character,
              phoneConnected = uiState.phoneConnected,
              listState = homeListState,
              onSelectSoloRoom = { navController.navigate(Routes.ROOMS_SOLO) },
              onSelectGroupRoom = { navController.navigate(Routes.ROOMS_GROUP) },
              onOpenSession = { navController.navigate(Routes.SESSION) },
            )
          }

          composable(Routes.ROOMS_SOLO) {
            RoomListScreen(
              title = "혼자 산책",
              emptyMessage = "혼자 하는 산책방이 없어요.\n폰에서 먼저 만들어주세요.",
              rooms = uiState.phone?.rooms.orEmpty().filter { it.mode == MODE_SINGLE },
              isSending = uiState.isSendingCommand,
              listState = soloRoomsListState,
              onStart = { room -> viewModel.startWalk(room.roomId) },
            )
          }

          composable(Routes.ROOMS_GROUP) {
            RoomListScreen(
              title = "같이 산책",
              emptyMessage = "같이 하는 산책방이 없어요.\n폰에서 먼저 만들어주세요.",
              rooms = uiState.phone?.rooms.orEmpty().filter { it.mode != MODE_SINGLE },
              isSending = uiState.isSendingCommand,
              listState = groupRoomsListState,
              onStart = { room -> viewModel.startWalk(room.roomId) },
            )
          }

          composable(Routes.SESSION) {
            val phone = uiState.phone
            // 종료 직후 한 프레임 동안 세션이 비어 있을 수 있다. 위의
            // LaunchedEffect가 홈으로 되돌릴 때까지 아무것도 그리지 않는다.
            if (phone?.session != null) {
              SessionScreen(
                state = phone,
                isSending = uiState.isSendingCommand,
                listState = sessionListState,
                onTogglePause = viewModel::togglePause,
                onRequestEnd = { navController.navigate(Routes.END_CONFIRM) },
              )
            }
          }

          composable(Routes.END_CONFIRM) {
            EndConfirmScreen(
              onConfirm = {
                viewModel.endWalk()
                // 폰이 기록을 저장하고 세션을 비울 때까지 걸리는 동안 확인
                // 화면에 갇혀 있지 않도록 진행 중 화면으로 돌려보낸다. 세션이
                // 실제로 끝나면 위의 LaunchedEffect가 홈까지 데려간다.
                navController.popBackStack()
              },
              onCancel = { navController.popBackStack() },
            )
          }
        }

        ErrorBanner(message = uiState.error, onTimeout = viewModel::consumeError)
      }
    }
  }
}

/** 명령을 못 보냈을 때만 잠깐 뜬다. 워치에는 토스트가 없어 직접 겹쳐 그린다. */
@Composable
private fun ErrorBanner(message: String?, onTimeout: () -> Unit) {
  if (message == null) {
    return
  }
  LaunchedEffect(message) {
    delay(ERROR_VISIBLE_MS)
    onTimeout()
  }
  Box(
    modifier = Modifier
      .fillMaxSize()
      .padding(bottom = 8.dp),
    contentAlignment = Alignment.BottomCenter,
  ) {
    Text(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 16.dp),
      text = message,
      style = MaterialTheme.typography.caption2,
      color = MaterialTheme.colors.error,
      textAlign = TextAlign.Center,
    )
  }
}
