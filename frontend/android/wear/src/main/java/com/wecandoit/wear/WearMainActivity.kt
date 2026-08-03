package com.wecandoit.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.wecandoit.wear.ui.WearApp

/**
 * 워치 앱의 유일한 액티비티. 화면 전환은 전부 Compose 내비게이션이 맡는다.
 */
class WearMainActivity : ComponentActivity() {

  private val viewModel: WearViewModel by viewModels()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setTheme(android.R.style.Theme_DeviceDefault)
    setContent { WearApp(viewModel) }
  }

  override fun onResume() {
    super.onResume()
    // 손목을 들어 화면이 켜질 때마다 폰에 최신 상태를 요청한다. 화면이 꺼져
    // 있는 동안 폰이 보낸 것은 Data Layer가 들고 있다가 주지만, 폰 앱이 그동안
    // 꺼졌다 켜졌으면 마지막 값이 오래됐을 수 있다.
    viewModel.refresh()
  }
}
