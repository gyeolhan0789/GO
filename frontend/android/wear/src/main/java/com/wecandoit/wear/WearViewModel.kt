package com.wecandoit.wear

import android.app.Application
import androidx.compose.ui.graphics.ImageBitmap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wecandoit.wear.data.PhoneCommand
import com.wecandoit.wear.data.PhoneLink
import com.wecandoit.wear.data.PhoneState
import com.wecandoit.wear.data.PhoneUpdate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class WearUiState(
  /** 폰이 아직 한 번도 상태를 안 보냈으면 null(첫 실행 또는 폰 앱 미실행). */
  val phone: PhoneState? = null,
  val character: ImageBitmap? = null,
  /**
   * 폰이 붙어 있는지. 확인하기 전에는 경고를 띄우지 않으려고 true로 시작한다
   * (앱을 열자마자 "연결 안 됨"이 한 프레임 깜빡이는 걸 막는다).
   */
  val phoneConnected: Boolean = true,
  /** 명령을 보내는 중. 버튼을 두 번 누르는 걸 막는다. */
  val isSendingCommand: Boolean = false,
  /** 한 번 보여주고 지우는 실패 안내. */
  val error: String? = null,
)

/**
 * 워치 화면 전체가 공유하는 상태.
 *
 * 워치는 아무것도 스스로 결정하지 않는다. 폰이 밀어준 상태를 그리고, 사용자가
 * 누른 것을 명령으로 되돌려 보낼 뿐이다. 그래서 "시작"을 눌러도 여기서 세션을
 * 만들지 않고, 폰이 세션을 만들어 다시 밀어줄 때까지 기다린다.
 */
class WearViewModel(application: Application) : AndroidViewModel(application) {

  private val link = PhoneLink(application)

  private val _uiState = MutableStateFlow(WearUiState())
  val uiState: StateFlow<WearUiState> = _uiState.asStateFlow()

  init {
    viewModelScope.launch {
      // 워치에 남아 있는 마지막 값을 먼저 그린다. 폰 응답을 기다리지 않는다.
      link.readCached().forEach(::applyUpdate)
      refresh()
    }
    viewModelScope.launch {
      link.updates().collect(::applyUpdate)
    }
  }

  /** 폰 연결 상태를 다시 확인하고 최신 상태를 밀어달라고 요청한다. */
  fun refresh() {
    viewModelScope.launch {
      val connected = link.isPhoneConnected()
      _uiState.update { it.copy(phoneConnected = connected) }
      if (connected) {
        link.send(PhoneCommand.RequestSync)
      }
    }
  }

  fun startWalk(roomId: Long) = send(PhoneCommand.StartWalk(roomId), "산책을 시작하지 못했어요")

  fun endWalk() = send(PhoneCommand.EndWalk, "산책을 종료하지 못했어요")

  fun consumeError() {
    _uiState.update { it.copy(error = null) }
  }

  private fun send(command: PhoneCommand, failureMessage: String) {
    if (_uiState.value.isSendingCommand) {
      return
    }
    _uiState.update { it.copy(isSendingCommand = true, error = null) }
    viewModelScope.launch {
      val sent = link.send(command)
      _uiState.update {
        it.copy(
          isSendingCommand = false,
          phoneConnected = sent,
          error = if (sent) null else failureMessage,
        )
      }
    }
  }

  private fun applyUpdate(update: PhoneUpdate) {
    _uiState.update { current ->
      when (update) {
        // 상태가 왔다는 건 폰 앱이 살아 있다는 뜻이다.
        is PhoneUpdate.State -> current.copy(phone = update.state, phoneConnected = true)
        is PhoneUpdate.Character -> current.copy(character = update.image)
      }
    }
  }
}
